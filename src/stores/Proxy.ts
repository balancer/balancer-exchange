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

export type SwapPreview = ExactAmountInPreview | ExactAmountOutPreview;

export interface ExactAmountOutPreview {
    tokenAmountOut: BigNumber;
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
    tokenAmountIn: BigNumber;
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
    tokenAmountIn?: BigNumber;
    tokenAmountOut?: BigNumber;
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
        tokenAmountIn: null,
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
        tokenAmountOut: null,
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
        swaps: Swap[],
        tokenIn: string,
        tokenAmountIn: BigNumber,
        decimalsIn: number,
        tokenOut: string,
        minAmountOut: BigNumber,
        decimalsOut: number
    ) => {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const proxyAddress = contractMetadataStore.getProxyAddress();

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthInSwapExactIn',
                [swaps, tokenOut, minAmountOut.toString()],
                {
                    value: ethers.utils.bigNumberify(
                        scale(tokenAmountIn, decimalsIn).toString()
                    ),
                }
            );
        } else if (tokenOut === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthOutSwapExactIn',
                [
                    swaps,
                    tokenIn,
                    scale(tokenAmountIn, decimalsIn).toString(),
                    minAmountOut.toString(),
                ]
            );
        } else {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchSwapExactIn',
                [
                    swaps,
                    tokenIn,
                    tokenOut,
                    scale(tokenAmountIn, decimalsIn).toString(),
                    minAmountOut.toString(),
                ]
            );
        }
    };

    @action batchSwapExactOut = async (
        swaps: Swap[],
        tokenIn: string,
        maxAmountIn: BigNumber,
        decimalsIn: number,
        tokenOut: string,
        tokenAmountOut: BigNumber,
        decimalsOut: number
    ) => {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const proxyAddress = contractMetadataStore.getProxyAddress();

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthInSwapExactOut',
                [swaps, tokenOut],
                { value: ethers.utils.bigNumberify(maxAmountIn.toString()) }
            );
        } else if (tokenOut === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchEthOutSwapExactOut',
                [swaps, tokenIn, maxAmountIn.toString()]
            );
        } else {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'batchSwapExactOut',
                [swaps, tokenIn, tokenOut, maxAmountIn.toString()]
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
        inputAmount: BigNumber,
        inputDecimals: number
    ): Promise<ExactAmountInPreview> => {
        try {
            this.setPreviewPending(true);
            const { contractMetadataStore, providerStore } = this.rootStore;

            const tokenAmountIn = scale(bnum(inputAmount), inputDecimals);

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let minAmountOut = helpers.setPropertyToZeroIfEmpty();

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenOut;

            const poolData = await findPoolsWithTokens(
                tokenInToFind,
                tokenOutToFind,
                providerStore.providerStatus.library,
                contractMetadataStore.getMultiAddress()
            );

            const costOutputToken = this.costCalculator.getCostOutputToken();

            const sorSwaps = findBestSwaps(
                poolData,
                SwapMethods.EXACT_IN,
                tokenAmountIn,
                3,
                costOutputToken
            );

            if (sorSwaps.length === 0) {
                this.setPreviewPending(false);
                return emptyExactAmountInPreview(
                    inputAmount,
                    'Insufficient liquidity on Balancer'
                );
            }

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

            const spotPrice = calcPrice(tokenAmountIn, spotOutput);

            const totalOutput = calcTotalOutput(swaps, poolData);

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountIn,
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
                    tokenAmountIn,
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
                tokenAmountIn,
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
        outputAmount: BigNumber,
        outputDecimals: number
    ): Promise<ExactAmountOutPreview> => {
        try {
            this.setPreviewPending(true);
            const { contractMetadataStore, providerStore } = this.rootStore;

            const tokenAmountOut = scale(bnum(outputAmount), outputDecimals);

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty();

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenOut;

            const poolData = await findPoolsWithTokens(
                tokenInToFind,
                tokenOutToFind,
                providerStore.providerStatus.library,
                contractMetadataStore.getMultiAddress()
            );
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let sorSwaps: SorSwap[] = findBestSwaps(
                poolData,
                SwapMethods.EXACT_OUT,
                tokenAmountOut,
                20,
                costOutputToken
            );

            if (sorSwaps.length === 0) {
                this.setPreviewPending(false);
                return emptyExactAmountOutPreview(
                    outputAmount,
                    'Insufficient liquidity on Balancer'
                );
            }

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

            const spotPrice = calcPrice(tokenAmountOut, spotInput);

            console.log('[Spot Price Calc]', {
                tokenAmountOut: tokenAmountOut.toString(),
                totalInputSpot: spotInput.toString(),
            });

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountOut,
                totalInput
            );

            const expectedSlippage = calcExpectedSlippage(
                effectivePrice,
                spotPrice
            );

            printDebugInfo(
                {
                    method: SwapMethods.EXACT_OUT,
                    tokenIn,
                    tokenOut,
                    tokenAmountOut,
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
                tokenAmountOut,
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
