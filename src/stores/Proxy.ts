import { action, observable } from 'mobx';
import * as deployed from 'deployed.json';
import * as helpers from 'utils/helpers';
import { bnum } from 'utils/helpers';
import {
    str,
    stringifyPoolData,
    printPoolData,
    printSorSwaps,
} from 'utils/helpers';
import RootStore from 'stores/Root';
import sor from 'balancer-sor';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';
import { calcOutGivenIn, calcInGivenOut, BONE } from 'utils/balancerCalcs';
import { parseEther } from 'ethers/utils';

export interface ExactAmountOutPreview {
    preview: {
        inputAmount: any;
        effectivePrice: any;
        swaps: any;
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

enum SwapMethod {
    ExactIn = "swapExactIn",
    ExactOut = "swapExactOut"
}

type Swap = [string, string, string, string];

type Swaps = any[];

class CostCalculator {
    gasPrice: BigNumber;
    gasPerTrade: BigNumber;
    outTokenEthPrice: BigNumber;
    costPerTrade: BigNumber;
    costOutputToken: BigNumber;

    constructor(params: {
        gasPrice: BigNumber;
        gasPerTrade: BigNumber;
        outTokenEthPrice: BigNumber;
    }) {
        const { gasPrice, gasPerTrade, outTokenEthPrice } = params;
        this.gasPrice = gasPrice;
        this.gasPerTrade = gasPerTrade;
        this.outTokenEthPrice = outTokenEthPrice;
        this.costPerTrade = gasPrice.times(gasPerTrade);
        this.costOutputToken = this.costPerTrade.times(outTokenEthPrice);
    }

    getCostOutputToken(): BigNumber {
        return this.costOutputToken;
    }
}

export const statusCodes = {
    NOT_LOADED: 0,
    PENDING: 1,
    ERROR: 2,
    SUCCESS: 3,
};

export default class ProxyStore {
    @observable previewPending: boolean;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.previewPending = false;
        this.costCalculator = new CostCalculator({
            gasPrice: new BigNumber(0.00000001),
            gasPerTrade: new BigNumber(210000),
            outTokenEthPrice: new BigNumber(100),
        });
    }

    isPreviewPending() {
        return this.previewPending;
    }

    setPreviewPending(value) {
        this.previewPending = value;
    }

    async findPoolsWithTokens(
        tokenIn: string,
        tokenOut: string,
        fromWei: boolean = false
    ): Promise<Pool[]> {
        let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut);

        if (pools.pools.length === 0)
            throw Error('There are no pools with selected tokens');

        let poolData: Pool[] = [];
        pools.pools.forEach(p => {
            let tI: any = p.tokens.find(
                t => helpers.toChecksum(t.address) === tokenIn
            );
            let tO: any = p.tokens.find(
                t => helpers.toChecksum(t.address) === tokenOut
            );
            let obj: Pool = {
                id: helpers.toChecksum(p.id),
                balanceIn: new BigNumber(tI.balance),
                balanceOut: new BigNumber(tO.balance),
                weightIn: new BigNumber(tI.denormWeight).div(
                    new BigNumber(p.totalWeight)
                ),
                weightOut: new BigNumber(tO.denormWeight).div(
                    new BigNumber(p.totalWeight)
                ),
                swapFee: new BigNumber(p.swapFee),
            };

            if (fromWei) {
                obj.balanceIn = obj.balanceIn.times(BONE);
                obj.balanceOut = obj.balanceOut.times(BONE);
                obj.weightIn = obj.weightIn.times(BONE);
                obj.weightOut = obj.weightOut.times(BONE);
                obj.swapFee = obj.swapFee.times(BONE);
            }

            poolData.push(obj);
        });
        return poolData;
    }

    findBestSwaps = (balancers: Pool[], swapType: SwapMethod, inputAmount: BigNumber, maxBalancers: number, costOutputToken: BigNumber): SorSwaps => {
        const sorSwaps = sor.linearizedSolution(stringifyPoolData(balancers), swapType, inputAmount.toString(), maxBalancers, costOutputToken.toString());
        return sorSwaps;
    };

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

        const poolData = await this.findPoolsWithTokens(tokenIn, tokenOut, true);
        const costOutputToken = this.costCalculator.getCostOutputToken();

        const sorSwaps = this.findBestSwaps(poolData, SwapMethod.ExactIn, inputAmount, 20, costOutputToken);

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
        tokenAmountOut: BigNumber,
        maxPrice: BigNumber
    ) => {
        const { tokenStore, providerStore } = this.rootStore;
        const { chainId } = providerStore.getActiveWeb3React();

        const poolData = await this.findPoolsWithTokens(tokenIn, tokenOut);
        const costOutputToken = this.costCalculator.getCostOutputToken();

        let sorSwaps: SorSwaps = sor.linearizedSolution(
            poolData,
            'swapExactOut',
            tokenAmountOut,
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
            [
                swaps,
                tokenIn,
                tokenOut,
                maxAmountIn,
                helpers.toWei(tokenAmountOut),
            ]
        );
    };

    calcEffectivePrice(tokenAmountIn, tokenAmountOut) {
        const amountIn = new BigNumber(tokenAmountIn);
        const amountOut = new BigNumber(tokenAmountOut);
        return amountIn.div(amountOut).toString();
    }

    simulatedBatchSwapExactOut = (
        sorSwaps: SorSwaps,
        poolData: Pool[],
        maxPrice: string,
        maxAmountIn: string
    ): {
        inputAmount: BigNumber;
        swaps: Swaps;
    } => {
        let totalAmountIn = new BigNumber(0);
        let swaps: Swap[] = [];
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

        printSorSwaps(sorSwaps);
        printPoolData(poolData);

        console.log({
            inputAmount: totalAmountIn,
        });
        return {
            inputAmount: totalAmountIn,
            swaps,
        };
    };

    sorSwapsToSwaps = (
        sorSwaps: SorSwaps,
        poolData: Pool[],
        maxPrice: BigNumber,
        minAmountOut: BigNumber
    ): Swap[] => {
        const swaps: Swap[] = [];
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
        return swaps;
    };

    simulatedBatchSwapExactIn = (
        swaps: Swap[],
        sorSwaps: SorSwaps,
        poolData: Pool[],
        maxPrice: string,
        minAmountOut: string
    ): BigNumber => {
        try {
            let totalAmountOut = new BigNumber(0);
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
        tokenIn,
        tokenOut,
        inputAmount
    ): Promise<ExactAmountInPreview> => {
        console.log(
            '[Action] previewBatchSwapExactIn',
            tokenIn,
            tokenOut,
            inputAmount
        );

        try {
            this.setPreviewPending(true);

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let minAmountOut = helpers.setPropertyToZeroIfEmpty();

            const poolData = await this.findPoolsWithTokens(
                tokenIn,
                tokenOut,
                true
            );
            const costOutputToken = this.costCalculator.getCostOutputToken();
            const sorSwaps = this.findBestSwaps(poolData, SwapMethod.ExactIn, inputAmount, 20, costOutputToken);

            const swaps = this.sorSwapsToSwaps(
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

            console.log({
                totalAmountOut: outputAmount.toString(),
            });

            const effectivePrice = this.calcEffectivePrice(
                inputAmount,
                helpers.fromWei(outputAmount.toString())
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
        tokenAmountOut: string
    ): Promise<ExactAmountOutPreview> => {
        console.log(
            '[Action] previewBatchSwapExactOut',
            tokenIn,
            tokenOut,
            tokenAmountOut
        );

        try {
            this.setPreviewPending(true);

            const poolData = await this.findPoolsWithTokens(
                tokenIn,
                tokenOut,
                true
            );
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty();

            const formattedPoolData = stringifyPoolData(poolData);

            let sorSwaps: SorSwaps = sor.linearizedSolution(
                formattedPoolData,
                'swapExactOut',
                tokenAmountOut,
                20,
                costOutputToken
            );

            const { inputAmount, swaps } = this.simulatedBatchSwapExactOut(
                sorSwaps,
                poolData,
                maxPrice,
                maxAmountIn
            );

            console.log(swaps);

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountOut,
                helpers.fromWei(inputAmount.toString())
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
