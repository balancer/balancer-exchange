import { action, observable } from 'mobx';
import { bnum, scale, fromWei } from 'utils/helpers';
import RootStore from 'stores/Root';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';
import { SwapMethods } from './SwapForm';
import { ethers } from 'ethers';
import { EtherKey } from './Token';
import { SorMultiSwap } from './Sor';
import { calcSpotPrice, bmul, bdiv } from '../utils/balancerCalcs';

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

const calcPrice = (amountIn, amountOut) => {
    console.log('[calcPrice]', {
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        price: amountIn.div(amountOut).toString(),
    });
    return amountIn.div(amountOut);
};

const calcExpectedSlippage = (
    spotPrice: BigNumber,
    effectivePrice: BigNumber
) => {
    const spotPercentage = spotPrice.div(effectivePrice).times(100);
    console.log('[calcExpectedSlippage]', {
        spotPrice: spotPrice.toString(),
        effectivePrice: effectivePrice.toString(),
        spotPercentage: spotPercentage.toString(),
        expectedSlippage: bnum(100)
            .minus(spotPercentage)
            .toString(),
    });

    return bnum(100).minus(spotPercentage);
};

const calcTotalSpotValue = async (
    method: SwapMethods,
    swaps: SorMultiSwap[],
    allPools: any[]
): Promise<BigNumber> => {
    let totalValue = bnum(0);

    for (let i = 0; i < swaps.length; i++) {
        let sorMultiSwap = swaps[i];

        let spotPrices = [];
        // for each swap in sequence calculate spot price. spot price of sequence is product of all spot prices.
        for (let j = 0; j < sorMultiSwap.sequence.length; j++) {
            let swap = sorMultiSwap.sequence[j];
            /*
            console.log(
                `!!!!!! Checking Swap:${i} Sequence:${j}, ${swap.pool}: ${
                    swap.tokenInParam
                }->${swap.tokenOutParam} Amount:${fromWei(swap.swapAmount)}`
            );
            */

            const spotPrice = calcSpotPrice(
                swap.balanceIn,
                swap.weightIn,
                swap.balanceOut,
                swap.weightOut,
                swap.swapFee
            );
            // console.log(`!!!!!!! swap[${i}:${j}] spotPrice: ${fromWei(spotPrice)}`);

            spotPrices.push(spotPrice);
        }

        const spotPrice = spotPrices.reduce((a, b) => bmul(a, b));

        if (method === SwapMethods.EXACT_IN) {
            const swapAmount = sorMultiSwap.sequence[0].swapAmount;
            totalValue = totalValue.plus(bdiv(bnum(swapAmount), spotPrice));
        } else if (method === SwapMethods.EXACT_OUT) {
            let swapAmount = sorMultiSwap.sequence[0].swapAmount;

            if (sorMultiSwap.sequence.length > 1)
                swapAmount = sorMultiSwap.sequence[1].swapAmount;

            totalValue = totalValue.plus(bmul(bnum(swapAmount), spotPrice));
            // console.log(`swap[${i}] spotPriceProduct: ${fromWei(spotPrice)} swapAmt: ${fromWei(swapAmount)}: tv:${fromWei(totalValue)}`);
        }
    }
    // console.log(`!!!!!!! calcTotalSpotValue: ${fromWei(totalValue)}`)

    return totalValue;
};

export const calcMinAmountOut = (
    spotValue: BigNumber,
    slippagePercent: BigNumber
): BigNumber => {
    const result = spotValue
        .minus(spotValue.times(slippagePercent.div(100)))
        .integerValue(); // TODO - fix this to be fully integer math

    console.log('[Min Out]', {
        spotValue: spotValue.toString(),
        slippagePercent: slippagePercent.toString(),
        results: spotValue
            .minus(spotValue.times(slippagePercent.div(100)))
            .toString(),
    });

    return result.gt(0) ? result : bnum(0);
};

export const calcMaxAmountIn = (
    spotValue: BigNumber,
    slippagePercent: BigNumber
): BigNumber => {
    const result = spotValue
        .plus(spotValue.times(slippagePercent.div(100)))
        .integerValue(); // TODO - fix this to be fully integer math

    console.log('[Max In]', {
        spotValue: spotValue.toString(),
        slippagePercent: slippagePercent.toString(),
        results: result.toString(),
    });
    return result;
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
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.previewPending = false;
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
            tokenIn = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

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
                ],
                {
                    value: ethers.utils.bigNumberify(
                        scale(tokenAmountIn, decimalsIn).toString()
                    ),
                }
            );
        } else if (tokenOut === EtherKey) {
            tokenOut = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

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
            tokenIn = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchSwapExactOut',
                [swaps, tokenIn, tokenOut, maxAmountIn.toString()],
                {
                    value: ethers.utils.bigNumberify(maxAmountIn.toString()),
                }
            );
        } else if (tokenOut === EtherKey) {
            tokenOut = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

            await providerStore.sendTransaction(
                ContractTypes.ExchangeProxy,
                proxyAddress,
                'multihopBatchSwapExactOut',
                [swaps, tokenIn, tokenOut, maxAmountIn.toString()]
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
            const {
                contractMetadataStore,
                poolStore,
                sorStore,
                swapFormStore,
            } = this.rootStore;

            this.setPreviewPending(true);

            if (poolStore.onChainPools.pools.length === 0) {
                swapFormStore.setSwapObjection('Waiting For Pools To Load');

                swapFormStore.showLoader = true;
                await poolStore.onChainPoolsPromise;
            }

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

            console.log(
                `[SOR] findBestSwapsMultiEps: ${tokenInToFind} ${tokenOutToFind} ${
                    SwapMethods.EXACT_IN
                } ${fromWei(tokenAmountIn)}`
            );

            const [totalOutput, sorSwaps] = await sorStore.findBestSwapsMulti(
                SwapMethods.EXACT_IN,
                tokenAmountIn,
                sorStore.noPools,
                sorStore.costOutputToken
            );

            const sorSwapsFormatted = await sorStore.formatSorSwaps(sorSwaps);

            if (sorSwapsFormatted.length === 0) {
                this.setPreviewPending(false);
                return emptyExactAmountInPreview(
                    inputAmount,
                    'Insufficient liquidity on Balancer'
                );
            }

            let spotOutput = await calcTotalSpotValue(
                SwapMethods.EXACT_IN,
                sorSwapsFormatted,
                poolStore.onChainPools.pools
            );

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

            this.setPreviewPending(false);

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
            const {
                contractMetadataStore,
                poolStore,
                sorStore,
                swapFormStore,
            } = this.rootStore;

            if (poolStore.onChainPools.pools.length === 0) {
                swapFormStore.setSwapObjection('Waiting For Pools To Load');

                swapFormStore.showLoader = true;
                await poolStore.onChainPoolsPromise;
            }

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

            console.log(
                `[SOR] findBestSwapsMultiEps: ${tokenInToFind} ${tokenOutToFind} ${
                    SwapMethods.EXACT_OUT
                } ${fromWei(tokenAmountOut)}`
            );

            // sorSwaps is the unchanged info from SOR that can be directly passed to proxy transaction
            const [totalInput, sorSwaps] = await sorStore.findBestSwapsMulti(
                SwapMethods.EXACT_OUT,
                tokenAmountOut,
                sorStore.noPools,
                sorStore.costInputToken
            );

            const sorSwapsFormatted = await sorStore.formatSorSwaps(sorSwaps);

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
                poolStore.onChainPools.pools
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

            console.log('[Eff Price Calc]', {
                tokenAmountOut: tokenAmountOut.toString(),
                totalInput: totalInput.toString(),
                effectivePrice: effectivePrice.toString(),
            });

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
