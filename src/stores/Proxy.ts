import { action, observable } from 'mobx';
import * as helpers from 'utils/helpers';
import {
    bnum,
    printPoolData,
    printSorSwaps,
    printSwapInput,
    printSwaps,
    scale,
} from 'utils/helpers';
import RootStore from 'stores/Root';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';
import { SwapMethods } from './SwapForm';
import CostCalculator from '../utils/CostCalculator';
import {
    calcExpectedSlippage,
    calcPrice,
    calcTotalInput,
    calcTotalOutput,
    calcTotalSpotValue,
    findBestSwaps,
    findPoolsWithTokens,
    formatSwapsExactAmountIn,
    formatSwapsExactAmountOut,
} from '../utils/sorWrapper';
import { ethers } from 'ethers';
import { EtherKey } from './Token';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import { supportedChainId } from '../provider/connectors';

export type SwapPreview = ExactAmountInPreview | ExactAmountOutPreview;

export interface ExactAmountOutPreview {
    outputAmount: BigNumber;
    totalInput: BigNumber | null;
    spotInput: BigNumber | null;
    effectivePrice: BigNumber | null;
    spotPrice: BigNumber | null;
    expectedSlippage: BigNumber | null;
    swaps: Swap[];
    validSwap: boolean;
    error?: string;
}

export interface ExactAmountInPreview {
    inputAmount: BigNumber;
    totalOutput: BigNumber | null;
    spotOutput: BigNumber | null;
    effectivePrice: BigNumber | null;
    spotPrice: BigNumber | null;
    expectedSlippage: BigNumber | null;
    swaps: Swap[];
    validSwap: boolean;
    error?: string;
}

export interface SwapInput {
    method: SwapMethods;
    tokenIn: string;
    tokenOut: string;
    inputAmount?: BigNumber;
    outputAmount?: BigNumber;
    minAmountOut?: BigNumber;
    maxAmountIn?: BigNumber;
    maxPrice: BigNumber;
}

export interface Pool {
    id: string;
    decimalsIn: number;
    decimalsOut: number;
    balanceIn: BigNumber;
    balanceOut: BigNumber;
    weightIn: BigNumber;
    weightOut: BigNumber;
    swapFee: BigNumber;
}

export interface SorSwap {
    pool: string;
    amount: BigNumber;
}

export type Swap = {
    pool: string;
    tokenInParam: string;
    tokenOutParam: string;
    maxPrice: string;
};

function printDebugInfo(
    input: SwapInput,
    swaps: Swap[],
    sorSwaps: SorSwap[],
    poolData: Pool[],
    result: BigNumber,
    effectivePrice: BigNumber
) {
    console.log('[Swap Preview]');
    printSwapInput(input);
    printPoolData(poolData);
    printSorSwaps(sorSwaps);
    printSwaps(input.method, swaps);
    console.log('[Result]', {
        result: result.toString(),
        effectivePrice: effectivePrice.toString(),
    });
}

export function emptyExactAmountInPreview(
    inputAmount,
    e?: string
): ExactAmountInPreview {
    return {
        inputAmount,
        totalOutput: null,
        spotOutput: null,
        effectivePrice: null,
        spotPrice: null,
        expectedSlippage: null,
        swaps: null,
        validSwap: false,
        error: !!e ? e : undefined,
    };
}

export function emptyExactAmountOutPreview(
    outputAmount,
    e?: string
): ExactAmountOutPreview {
    return {
        outputAmount,
        totalInput: null,
        spotInput: null,
        effectivePrice: null,
        spotPrice: null,
        expectedSlippage: null,
        swaps: null,
        validSwap: false,
        error: !!e ? e : undefined,
    };
}

export default class ProxyStore {
    @observable previewPending: boolean;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.previewPending = false;
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });
    }

    isPreviewPending() {
        return this.previewPending;
    }

    @action setPreviewPending(value) {
        this.previewPending = value;
    }

    /*
        Swap Methods - Action
    */
    @action batchSwapExactIn = async (
        web3React: Web3ReactContextInterface,
        swaps: Swap[],
        tokenIn: string,
        inputAmount: BigNumber,
        tokenOut: string,
        minAmountOut: BigNumber
    ) => {
        const { tokenStore, providerStore } = this.rootStore;
        const { chainId } = web3React;

        console.log('[BatchSwapExactIn]', {
            swaps,
            tokenIn,
            tokenOut,
            tokenAmountIn: inputAmount.toString(),
            minAmountOut: minAmountOut.toString(),
        });

        const proxyAddress = tokenStore.getProxyAddress(chainId);

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthInSwapExactIn',
                [swaps, tokenOut, minAmountOut.toString()],
                { value: ethers.utils.bigNumberify(inputAmount.toString()) }
            );
        } else if (tokenOut === EtherKey) {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthOutSwapExactIn',
                [
                    swaps,
                    tokenIn,
                    inputAmount.toString(),
                    minAmountOut.toString(),
                ]
            );
        } else {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchSwapExactIn',
                [
                    swaps,
                    tokenIn,
                    tokenOut,
                    inputAmount.toString(),
                    minAmountOut.toString(),
                ]
            );
        }
    };

    @action batchSwapExactOut = async (
        web3React: Web3ReactContextInterface,
        swaps: Swap[],
        tokenIn: string,
        maxAmountIn: BigNumber,
        tokenOut: string,
        amountOut: BigNumber
    ) => {
        const { tokenStore, providerStore } = this.rootStore;
        const { chainId } = web3React;

        const proxyAddress = tokenStore.getProxyAddress(chainId);

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthInSwapExactOut',
                [swaps, tokenOut, amountOut.toString()],
                { value: ethers.utils.bigNumberify(maxAmountIn.toString()) }
            );
        } else if (tokenOut === EtherKey) {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthOutSwapExactOut',
                [swaps, tokenIn, amountOut.toString(), maxAmountIn.toString()]
            );
        } else {
            await providerStore.sendTransaction(
                web3React,
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchSwapExactOut',
                [
                    swaps,
                    tokenIn,
                    tokenOut,
                    amountOut.toString(),
                    maxAmountIn.toString(),
                ]
            );
        }
    };

    calcEffectivePrice(amountIn: BigNumber, amountOut: BigNumber): BigNumber {
        return amountIn.div(amountOut);
    }

    /*
        Swap Methods - Preview
    */
    previewBatchSwapExactIn = async (
        tokenIn: string,
        tokenOut: string,
        inputAmount: BigNumber
    ): Promise<ExactAmountInPreview> => {
        try {
            this.setPreviewPending(true);
            const { tokenStore } = this.rootStore;

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let minAmountOut = helpers.setPropertyToZeroIfEmpty();

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? tokenStore.getWethAddress(supportedChainId)
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? tokenStore.getWethAddress(supportedChainId)
                    : tokenOut;

            const poolData = await findPoolsWithTokens(
                tokenInToFind,
                tokenOutToFind
            );

            // FIX ONCE TOKEN DECIMALS ARE FETCHED SEPARATELY
            inputAmount = scale(inputAmount, poolData[0].decimalsIn);

            const costOutputToken = this.costCalculator.getCostOutputToken();

            const sorSwaps = findBestSwaps(
                poolData,
                SwapMethods.EXACT_IN,
                inputAmount,
                20,
                costOutputToken
            );

            const swaps = formatSwapsExactAmountIn(
                sorSwaps,
                poolData,
                bnum(maxPrice),
                bnum(minAmountOut)
            );

            const spotOutput = calcTotalSpotValue(
                SwapMethods.EXACT_IN,
                swaps,
                poolData
            );

            const spotPrice = calcPrice(
                scale(inputAmount, -poolData[0].decimalsIn),
                scale(spotOutput, -poolData[0].decimalsOut)
            );
            const totalOutput = calcTotalOutput(swaps, poolData);

            const effectivePrice = this.calcEffectivePrice(
                scale(inputAmount, -poolData[0].decimalsIn),
                totalOutput
            );

            const expectedSlippage = calcExpectedSlippage(
                spotPrice,
                effectivePrice
            );

            printDebugInfo(
                {
                    method: SwapMethods.EXACT_IN,
                    tokenIn,
                    tokenOut,
                    inputAmount,
                    maxPrice: bnum(0),
                },
                swaps,
                sorSwaps,
                poolData,
                totalOutput,
                effectivePrice
            );

            this.setPreviewPending(false);
            return {
                inputAmount,
                totalOutput,
                spotOutput,
                effectivePrice,
                spotPrice,
                expectedSlippage,
                swaps,
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountIn', e);
            this.setPreviewPending(false);
            return emptyExactAmountInPreview(inputAmount, e.message);
        }
    };

    previewBatchSwapExactOut = async (
        tokenIn: string,
        tokenOut: string,
        outputAmount: BigNumber
    ): Promise<ExactAmountOutPreview> => {
        try {
            this.setPreviewPending(true);
            const { tokenStore } = this.rootStore;

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty();

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? tokenStore.getWethAddress(supportedChainId)
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? tokenStore.getWethAddress(supportedChainId)
                    : tokenOut;

            const poolData = await findPoolsWithTokens(
                tokenInToFind,
                tokenOutToFind
            );
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let sorSwaps: SorSwap[] = findBestSwaps(
                poolData,
                SwapMethods.EXACT_OUT,
                outputAmount,
                20,
                costOutputToken
            );

            const swaps = formatSwapsExactAmountOut(
                sorSwaps,
                poolData,
                bnum(maxPrice),
                bnum(maxAmountIn)
            );

            const totalInput = calcTotalInput(
                swaps,
                poolData,
                maxPrice,
                maxAmountIn
            );

            const spotInput = calcTotalSpotValue(
                SwapMethods.EXACT_OUT,
                swaps,
                poolData
            );

            const spotPrice = calcPrice(bnum(outputAmount), spotInput);

            console.log('[Spot Price Calc]', {
                outputAmount: outputAmount.toString(),
                totalInputSpot: spotInput.toString(),
            });

            const effectivePrice = this.calcEffectivePrice(
                bnum(outputAmount),
                helpers.scale(totalInput, -18)
            );

            const expectedSlippage = calcExpectedSlippage(
                spotPrice,
                effectivePrice
            );

            printDebugInfo(
                {
                    method: SwapMethods.EXACT_OUT,
                    tokenIn,
                    tokenOut,
                    outputAmount,
                    maxPrice: bnum(0),
                },
                swaps,
                sorSwaps,
                poolData,
                totalInput,
                effectivePrice
            );

            if (totalInput.isNaN()) {
                throw new Error('NaN total calculated input');
            }

            this.setPreviewPending(false);
            return {
                outputAmount,
                totalInput,
                spotInput,
                effectivePrice,
                spotPrice,
                expectedSlippage,
                swaps,
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountOut', e);
            this.setPreviewPending(false);
            return emptyExactAmountOutPreview(outputAmount, e.message);
        }
    };
}
