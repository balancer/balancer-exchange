import { action, observable } from 'mobx';
import { bnum, scale, fromWei } from 'utils/helpers';
import RootStore from 'stores/Root';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';
import { SwapMethods } from './SwapForm';
import CostCalculator from '../utils/CostCalculator';
import {
    calcExpectedSlippage,
    calcPrice,
    calcTotalSpotValue,
    findBestSwapsMulti,
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
    swaps: any[][];
    sorSwapsFormatted: SorMultiSwap[];
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
    swaps: any[][];
    sorSwapsFormatted: SorMultiSwap[];
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

export interface MultiSwap {
    pool: string;
    tokenInParam: string;
    tokenOutParam: string;
    maxPrice: string;
    swapAmount: string;
    limitReturnAmount: string;
}

export interface SorMultiSwap {
    sequence: MultiSwap[];
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
        sorSwapsFormatted: null,
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
        sorSwapsFormatted: null,
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
        swaps: any[][],
        tokenIn: string,
        tokenAmountIn: BigNumber,
        decimalsIn: number,
        tokenOut: string,
        minAmountOut: BigNumber,
        decimalsOut: number
    ) => {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const proxyAddress = contractMetadataStore.getProxyAddress();

        console.log(`batchSwapExactIn Swapping: ${tokenIn}->${tokenOut}`);
        console.log(`Amt In: ${tokenAmountIn.toString()}`);
        console.log(`Min Amt Out: ${fromWei(minAmountOut)}`);
        console.log(`Swap sequences:`);
        // console.log(`Decimals In: ${decimalsIn}`);
        // console.log(`Decimals Out: ${decimalsOut}`);

        swaps.forEach(swap => {
            swap.forEach(sequence => {
                console.log(
                    `${sequence.pool}: ${sequence.tokenIn}->${
                        sequence.tokenOut
                    }, Amt:${fromWei(sequence.swapAmount)} Limit:${fromWei(
                        sequence.limitReturnAmount
                    )} MaxPrice:${fromWei(sequence.maxPrice)}`
                );
            });
        });

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchEthInSwapExactIn',
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
                'multihopBatchEthOutSwapExactIn',
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
                'multihopBatchSwapExactIn',
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
        swaps: any[][],
        tokenIn: string,
        maxAmountIn: BigNumber,
        decimalsIn: number,
        tokenOut: string,
        tokenAmountOut: BigNumber,
        decimalsOut: number
    ) => {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const proxyAddress = contractMetadataStore.getProxyAddress();

        console.log(`batchSwapExactOut Swapping: ${tokenIn}->${tokenOut}`);
        console.log(`Max In: ${fromWei(maxAmountIn)}`);
        console.log(`Amt Out: ${tokenAmountOut.toString()}`);
        console.log(`Swap sequences:`);
        // console.log(`Decimals In: ${decimalsIn}`);
        // console.log(`Decimals Out: ${decimalsOut}`);

        swaps.forEach(swap => {
            swap.forEach(sequence => {
                console.log(
                    `${sequence.pool}: ${sequence.tokenIn}->${
                        sequence.tokenOut
                    }, Amt:${fromWei(sequence.swapAmount)} Limit:${fromWei(
                        sequence.limitReturnAmount
                    )} MaxPrice:${fromWei(sequence.maxPrice)}`
                );
            });
        });

        if (tokenIn === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchEthInSwapExactOut',
                [swaps, tokenOut],
                { value: ethers.utils.bigNumberify(maxAmountIn.toString()) }
            );
        } else if (tokenOut === EtherKey) {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchEthOutSwapExactOut',
                [swaps, tokenIn, maxAmountIn.toString()]
            );
        } else {
            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchSwapExactOut',
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
            console.time('previewBatchSwapExactIn');
            this.setPreviewPending(true);
            const { contractMetadataStore, poolStore } = this.rootStore;
            const tokenAmountIn = scale(bnum(inputAmount), inputDecimals);

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenOut;

            // returns 0
            const costOutputToken = this.costCalculator.getCostOutputToken();

            console.time('findBestSwapsMulti');
            // TODO: Combine sorSwapsFormatted/sorSwaps
            // sorSwaps is the unchanged info from SOR that can be directly passed to proxy transaction
            const [
                sorSwapsFormatted,
                totalOutput,
                sorSwaps,
            ] = await findBestSwapsMulti(
                tokenInToFind,
                tokenOutToFind,
                SwapMethods.EXACT_IN,
                tokenAmountIn,
                4,
                costOutputToken
            );

            console.timeEnd('findBestSwapsMulti');

            if (sorSwapsFormatted.length === 0) {
                this.setPreviewPending(false);
                return emptyExactAmountInPreview(
                    inputAmount,
                    'Insufficient liquidity on Balancer'
                );
            }

            console.time('calcTotalSpotValue');

            let spotOutput = await calcTotalSpotValue(
                SwapMethods.EXACT_IN,
                sorSwapsFormatted,
                poolStore.allPools
            );

            console.timeEnd('calcTotalSpotValue');

            console.time('calcPrice');

            const spotPrice = calcPrice(tokenAmountIn, spotOutput);

            console.log('[Spot Price Calc]', {
                tokenAmountIn: tokenAmountIn.toString(),
                spotOutput: spotOutput.toString(),
            });

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountIn,
                totalOutput
            );

            const expectedSlippage = calcExpectedSlippage(
                spotPrice,
                effectivePrice
            );

            console.timeEnd('calcPrice');

            this.setPreviewPending(false);
            console.timeEnd('previewBatchSwapExactIn');

            return {
                tokenAmountIn,
                totalOutput,
                spotOutput,
                effectivePrice,
                spotPrice,
                expectedSlippage,
                swaps: sorSwaps,
                sorSwapsFormatted: sorSwapsFormatted,
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
            const { contractMetadataStore, poolStore } = this.rootStore;

            const tokenAmountOut = scale(bnum(outputAmount), outputDecimals);

            // Use WETH address for Ether
            const tokenInToFind =
                tokenIn === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenIn;
            const tokenOutToFind =
                tokenOut === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenOut;

            // Returns 0
            const costOutputToken = this.costCalculator.getCostOutputToken();

            const [
                sorSwapsFormatted,
                totalInput,
                sorSwaps,
            ] = await findBestSwapsMulti(
                tokenInToFind,
                tokenOutToFind,
                SwapMethods.EXACT_OUT,
                tokenAmountOut,
                4,
                costOutputToken
            );

            if (sorSwapsFormatted.length === 0) {
                this.setPreviewPending(false);
                return emptyExactAmountOutPreview(
                    outputAmount,
                    'Insufficient liquidity on Balancer'
                );
            }

            const spotInput = await calcTotalSpotValue(
                SwapMethods.EXACT_OUT,
                sorSwapsFormatted,
                poolStore.allPools
            );

            console.log('[Spot Price Calc]', {
                tokenAmountOut: tokenAmountOut.toString(),
                totalInputSpot: spotInput.toString(),
            });
            const spotPrice = calcPrice(tokenAmountOut, spotInput);

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountOut,
                totalInput
            );

            const expectedSlippage = calcExpectedSlippage(
                effectivePrice,
                spotPrice
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
                swaps: sorSwaps,
                sorSwapsFormatted: sorSwapsFormatted,
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountOut', e);
            this.setPreviewPending(false);
            return emptyExactAmountOutPreview(outputAmount, e.message);
        }
    };
}
