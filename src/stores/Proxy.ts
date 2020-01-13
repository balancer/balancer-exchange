import { action, observable } from 'mobx';
import * as helpers from 'utils/helpers';
import {
    bnum,
    formatPoolData,
    printPoolData,
    printSorSwaps,
    printSwapInput,
    Scale,
} from 'utils/helpers';
import RootStore from 'stores/Root';
import sor from 'balancer-sor';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';
import { BONE, calcInGivenOut, calcOutGivenIn } from 'utils/balancerCalcs';
import { SwapMethods } from './SwapForm';
import CostCalculator from '../utils/CostCalculator';
import { findBestSwaps, findPoolsWithTokens, formatSwapsExactAmountIn, formatSwapsExactAmountOut } from "../utils/sorWrapper";

export interface ExactAmountOutPreview {
    preview: {
        inputAmount: BigNumber | null;
        effectivePrice: BigNumber | null;
        swaps: Swap[];
    };
    validSwap: boolean;
}

export interface ExactAmountInPreview {
    preview: {
        outputAmount: any;
        effectivePrice: any;
        swaps: any;
    };
    validSwap: boolean;
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
    balanceIn: BigNumber;
    balanceOut: BigNumber;
    weightIn: BigNumber;
    weightOut: BigNumber;
    swapFee: BigNumber;
}

export interface StringifiedPool {
    id: string;
    balanceIn: string;
    balanceOut: string;
    weightIn: string;
    weightOut: string;
    swapFee: string;
}

export interface SorSwaps {
    inputAmounts: BigNumber[];
    selectedBalancers: string[];
    totalOutput: BigNumber;
}

export type Swap = [string, string, string, string];

function printDebugInfo(
    input: SwapInput,
    sorSwaps: SorSwaps,
    poolData: Pool[],
    result: BigNumber,
    effectivePrice: BigNumber
) {
    console.log('[Swap Preview]');
    printSwapInput(input);
    printPoolData(poolData);
    printSorSwaps(sorSwaps);
    console.log('[Result]', {
        result: result.toString(),
        effectivePrice: effectivePrice.toString(),
    });
}

export default class ProxyStore {
    @observable previewPending: boolean;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.previewPending = false;
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0.00000001),
            gasPerTrade: bnum(210000),
            outTokenEthPrice: bnum(100),
        });
    }

    isPreviewPending() {
        return this.previewPending;
    }

    setPreviewPending(value) {
        this.previewPending = value;
    }

    /*
        Swap Methods - Action
    */
    @action batchSwapExactIn = async (
        tokenIn: string,
        inputAmount: BigNumber,
        tokenOut: string,
        minAmountOut: BigNumber,
        maxPrice: BigNumber
    ) => {
        const { tokenStore, providerStore } = this.rootStore;
        const { chainId } = providerStore.getActiveWeb3React();

        const poolData = await findPoolsWithTokens(
            tokenIn,
            tokenOut,
            true
        );
        const costOutputToken = this.costCalculator.getCostOutputToken();

        const sorSwaps = findBestSwaps(
            poolData,
            SwapMethods.EXACT_IN,
            inputAmount,
            20,
            costOutputToken
        );

        let swaps: Swap[] = [];
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].times(BONE);
            let swap: Swap = [
                sorSwaps.selectedBalancers[i],
                swapAmount.toString(),
                minAmountOut.toString(),
                maxPrice.toString(),
            ];
            swaps.push(swap);
        }

        console.log('[BatchSwapExactIn]', {
            swaps,
            tokenIn,
            tokenOut,
            tokenAmountIn: inputAmount.toString(),
            minAmountOut: minAmountOut.toString(),
        });

        const proxyAddress = tokenStore.getProxyAddress(chainId);

        await providerStore.sendTransaction(
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
    };

    @action batchSwapExactOut = async (
        tokenIn: string,
        maxAmountIn: BigNumber,
        tokenOut: string,
        amountOut: BigNumber,
        maxPrice: BigNumber
    ) => {
        const { tokenStore, providerStore } = this.rootStore;
        const { chainId } = providerStore.getActiveWeb3React();

        const poolData = await findPoolsWithTokens(tokenIn, tokenOut);
        const costOutputToken = this.costCalculator.getCostOutputToken();

        let sorSwaps: SorSwaps = sor.linearizedSolution(
            poolData,
            'swapExactOut',
            amountOut,
            20,
            costOutputToken
        );

        let swaps: Swap[] = [];
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].toString();
            let swap: Swap = [
                sorSwaps.selectedBalancers[i],
                maxAmountIn.toString(),
                helpers.toWei(swapAmount).toString(),
                maxPrice.toString(),
            ];
            swaps.push(swap);
        }

        const proxyAddress = tokenStore.getProxyAddress(chainId);

        await providerStore.sendTransaction(
            ContractTypes.ExchangeProxy,
            proxyAddress,
            'batchSwapExactIn',
            [swaps, tokenIn, tokenOut, maxAmountIn, helpers.toWei(amountOut)]
        );
    };

    calcEffectivePrice(amountIn: BigNumber, amountOut: BigNumber): BigNumber {
        return amountIn.div(amountOut);
    }

    /* Go through selected swaps and determine the total input */
    simulatedBatchSwapExactOut = (
        swaps: Swap[],
        sorSwaps: SorSwaps,
        poolData: Pool[],
        maxPrice: string,
        maxAmountIn: string
    ): BigNumber => {
        try {
            let totalAmountIn = bnum(0);
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let swapAmount = sorSwaps.inputAmounts[i].times(BONE);
                if (swapAmount.isNaN()) {
                    throw new Error('NaN swap amount');
                }
                let swap: Swap = [
                    sorSwaps.selectedBalancers[i],
                    maxAmountIn,
                    swapAmount.toString(),
                    maxPrice,
                ];
                swaps.push(swap);
                const pool = poolData.find(
                    p => p.id == sorSwaps.selectedBalancers[i]
                );
                if (!pool) {
                    throw new Error(
                        '[Invariant] No pool found for selected balancer index'
                    );
                }

                const preview = calcInGivenOut(
                    pool.balanceIn,
                    pool.weightIn,
                    pool.balanceOut,
                    pool.weightOut,
                    swapAmount,
                    pool.swapFee
                );

                console.log({
                    preview,
                });

                totalAmountIn = totalAmountIn.plus(preview);
            }

            return totalAmountIn;
        } catch (e) {
            throw new Error(e);
        }
    };

    /* Go through selected swaps and determine the total output */
    simulatedBatchSwapExactIn = (
        swaps: Swap[],
        sorSwaps: SorSwaps,
        poolData: Pool[],
        maxPrice: string,
        minAmountOut: string
    ): BigNumber => {
        try {
            let totalAmountOut = bnum(0);
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                const swapAmount = swaps[i][1];

                const pool = poolData.find(
                    p => p.id == sorSwaps.selectedBalancers[i]
                );
                if (!pool) {
                    throw new Error(
                        '[Invariant] No pool found for selected balancer index'
                    );
                }

                const preview = calcOutGivenIn(
                    pool.balanceIn,
                    pool.weightIn,
                    pool.balanceOut,
                    pool.weightOut,
                    bnum(swapAmount),
                    pool.swapFee
                );

                totalAmountOut = totalAmountOut.plus(preview);
            }
            return totalAmountOut;
        } catch (e) {
            throw new Error(e);
        }
    };

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

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let minAmountOut = helpers.setPropertyToZeroIfEmpty();

            const poolData = await findPoolsWithTokens(
                tokenIn,
                tokenOut,
                true
            );
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

            const outputAmount = this.simulatedBatchSwapExactIn(
                swaps,
                sorSwaps,
                poolData,
                maxPrice,
                minAmountOut
            );

            const effectivePrice = this.calcEffectivePrice(
                inputAmount,
                helpers.scale(outputAmount, Scale.fromWei)
            );

            printDebugInfo(
                {
                    method: SwapMethods.EXACT_IN,
                    tokenIn,
                    tokenOut,
                    inputAmount,
                    maxPrice: bnum(0),
                },
                sorSwaps,
                poolData,
                outputAmount,
                effectivePrice
            );

            this.setPreviewPending(false);
            return {
                preview: {
                    outputAmount: outputAmount.toString(),
                    effectivePrice,
                    swaps,
                },
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountIn', e);
            this.setPreviewPending(false);
            return {
                preview: {
                    outputAmount: null,
                    effectivePrice: null,
                    swaps: null,
                },
                validSwap: false,
            };
        }
    };

    previewBatchSwapExactOut = async (
        tokenIn: string,
        tokenOut: string,
        amountOut: BigNumber
    ): Promise<ExactAmountOutPreview> => {
        try {
            this.setPreviewPending(true);

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty();

            const poolData = await findPoolsWithTokens(
                tokenIn,
                tokenOut,
                true
            );
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let sorSwaps: SorSwaps = findBestSwaps(
                poolData,
                SwapMethods.EXACT_OUT,
                amountOut,
                20,
                costOutputToken
            );

            const swaps = formatSwapsExactAmountOut(
                sorSwaps,
                poolData,
                bnum(maxPrice),
                bnum(maxAmountIn)
            );

            const inputAmount = this.simulatedBatchSwapExactOut(
                swaps,
                sorSwaps,
                poolData,
                maxPrice,
                maxAmountIn
            );

            const effectivePrice = this.calcEffectivePrice(
                bnum(amountOut),
                helpers.scale(inputAmount, Scale.fromWei)
            );

            printDebugInfo(
              {
                  method: SwapMethods.EXACT_OUT,
                  tokenIn,
                  tokenOut,
                  outputAmount: amountOut,
                  maxPrice: bnum(0),
              },
              sorSwaps,
              poolData,
              inputAmount,
              effectivePrice
            );

            if (inputAmount.isNaN()) {
                throw new Error('NaN total calculated input');
            }

            this.setPreviewPending(false);
            return {
                preview: {
                    inputAmount,
                    effectivePrice,
                    swaps,
                },
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountOut', e);
            this.setPreviewPending(false);
            return {
                preview: {
                    inputAmount: null,
                    effectivePrice: null,
                    swaps: null,
                },
                validSwap: false,
            };
        }
    };
}
