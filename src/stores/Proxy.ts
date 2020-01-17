import { action, observable } from 'mobx';
import * as helpers from 'utils/helpers';
import {
    bnum,
    formatPoolData,
    printPoolData,
    printSorSwaps,
    printSwapInput,
    printSwaps,
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
import {
    calcTotalInput,
    calcTotalOutput,
    findBestSwaps,
    findPoolsWithTokens,
    formatSwapsExactAmountIn,
    formatSwapsExactAmountOut,
} from '../utils/sorWrapper';

export interface ExactAmountOutPreview {
    totalInput: BigNumber | null;
    effectivePrice: BigNumber | null;
    swaps: Swap[];
    validSwap: boolean;
}

export interface ExactAmountInPreview {
    totalOutput: BigNumber | null;
    effectivePrice: BigNumber | null;
    swaps: Swap[];
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
    swaps: Swap[],
    sorSwaps: SorSwaps,
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

        const poolData = await findPoolsWithTokens(tokenIn, tokenOut, true);
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

            const poolData = await findPoolsWithTokens(tokenIn, tokenOut, true);
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

            const totalOutput = calcTotalOutput(swaps, sorSwaps, poolData);

            const effectivePrice = this.calcEffectivePrice(
                inputAmount,
                helpers.scale(totalOutput, Scale.fromWei)
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
                totalOutput,
                effectivePrice,
                swaps,
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountIn', e);
            this.setPreviewPending(false);
            return {
                totalOutput: null,
                effectivePrice: null,
                swaps: null,
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

            const poolData = await findPoolsWithTokens(tokenIn, tokenOut, true);
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

            const totalInput = calcTotalInput(
                swaps,
                sorSwaps,
                poolData,
                maxPrice,
                maxAmountIn
            );

            const effectivePrice = this.calcEffectivePrice(
                bnum(amountOut),
                helpers.scale(totalInput, Scale.fromWei)
            );

            printDebugInfo(
                {
                    method: SwapMethods.EXACT_OUT,
                    tokenIn,
                    tokenOut,
                    outputAmount: amountOut,
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
                totalInput,
                effectivePrice,
                swaps,
                validSwap: true,
            };
        } catch (e) {
            log.error('[Error] previewSwapExactAmountOut', e);
            this.setPreviewPending(false);
            return {
                totalInput: null,
                effectivePrice: null,
                swaps: null,
                validSwap: false,
            };
        }
    };
}
