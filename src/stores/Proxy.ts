import { action, observable } from 'mobx';
import * as deployed from 'deployed.json';
import * as helpers from 'utils/helpers';
import { str } from 'utils/helpers';
import RootStore from 'stores/Root';
import sor from 'balancer-sor';
import { BigNumber } from 'utils/bignumber';
import * as log from 'loglevel';
import { ContractTypes } from './Provider';

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
    balanceIn: string;
    balanceOut: string;
    weightIn: string;
    weightOut: string;
    swapFee: string;
}

export interface SorSwaps {
    inputAmounts: BigNumber[],
    selectedBalancers: string[],
    totalOutput: BigNumber
}

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

    getCostOutputToken(): string {
        return str(this.costOutputToken);
    }
}

export interface Swap {}

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

    async getPoolsWithToken(
        tokenIn: string,
        tokenOut: string
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
                balanceIn: str(new BigNumber(tI.balance)),
                balanceOut: str(new BigNumber(tO.balance)),
                weightIn: str(
                    new BigNumber(tI.denormWeight).div(new BigNumber(p.totalWeight))
                ),
                weightOut: str(
                    new BigNumber(tO.denormWeight).div(new BigNumber(p.totalWeight))
                ),
                swapFee: str(new BigNumber(p.swapFee)),
            };
            poolData.push(obj);
        });
        return poolData;
    }

    /*
        Swap Methods - Action
    */
    @action batchSwapExactIn = async (
        tokenIn,
        tokenAmountIn,
        tokenOut,
        minAmountOut,
        maxPrice
    ) => {
        const proxy = this.rootStore.providerStore.getContract(
            ContractTypes.ExchangeProxy,
            deployed['kovan'].proxy
        );

        const poolData = await this.getPoolsWithToken(tokenIn, tokenOut);
        const costOutputToken = this.costCalculator.getCostOutputToken();

        let sorSwaps: SorSwaps = sor.linearizedSolution(
            poolData,
            'swapExactIn',
            tokenAmountIn,
            20,
            costOutputToken
        );

        let swaps: any[] = [];
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].toString();
            let swap = [
                sorSwaps.selectedBalancers[i],
                helpers.toWei(swapAmount),
                helpers.toWei('0'),
                maxPrice,
            ];
            swaps.push(swap);
        }
        await proxy
            .batchSwapExactIn(
                swaps,
                tokenIn,
                tokenOut,
                helpers.toWei(tokenAmountIn),
                minAmountOut
            )
            .send();
    };

    @action batchSwapExactOut = async (
        tokenIn,
        maxAmountIn,
        tokenOut,
        tokenAmountOut,
        maxPrice
    ) => {
        const proxy = this.rootStore.providerStore.getContract(
            ContractTypes.ExchangeProxy,
            deployed['kovan'].proxy
        );

        const poolData = await this.getPoolsWithToken(tokenIn, tokenOut);
        const costOutputToken = this.costCalculator.getCostOutputToken();

        let sorSwaps: SorSwaps = sor.linearizedSolution(
            poolData,
            'swapExactOut',
            tokenAmountOut,
            20,
            costOutputToken
        );

        let swaps: any[] = [];
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].toString();
            let swap = [
                sorSwaps.selectedBalancers[i],
                maxAmountIn,
                helpers.toWei(swapAmount),
                maxPrice,
            ];
            swaps.push(swap);
        }
        await proxy
            .batchSwapExactOut(
                swaps,
                tokenIn,
                tokenOut,
                maxAmountIn,
                helpers.toWei(tokenAmountOut)
            )
            .send();
    };

    calcEffectivePrice(tokenAmountIn, tokenAmountOut) {
        const amountIn = new BigNumber(tokenAmountIn);
        const amountOut = new BigNumber(tokenAmountOut);
        return amountIn.div(amountOut).toString();
    }

    /*
        Swap Methods - Preview
    */
    previewBatchSwapExactIn = async (
        tokenIn,
        tokenOut,
        tokenAmountIn
    ): Promise<ExactAmountInPreview> => {
        const proxy = this.rootStore.providerStore.getContract(
            ContractTypes.ExchangeProxyCallable,
            deployed['kovan'].proxy
        );

        console.log(
            '[Action] previewBatchSwapExactIn',
            tokenIn,
            tokenOut,
            tokenAmountIn
        );

        try {
            this.setPreviewPending(true);

            const poolData = await this.getPoolsWithToken(tokenIn, tokenOut);
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let minAmountOut = helpers.setPropertyToZeroIfEmpty();

            let sorSwaps: SorSwaps = sor.linearizedSolution(
                poolData,
                'swapExactIn',
                tokenAmountIn,
                20,
                costOutputToken
            );

            console.log(sorSwaps);

            let swaps: any[] = [];
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let swapAmount = sorSwaps.inputAmounts[i].toString();
                let swap = [
                    sorSwaps.selectedBalancers[i],
                    helpers.toWei(swapAmount),
                    helpers.toWei('0'),
                    maxPrice,
                ];
                swaps.push(swap);
            }

            const preview = await proxy.batchSwapExactIn(
                swaps,
                tokenIn,
                tokenOut,
                helpers.toWei(tokenAmountIn),
                minAmountOut
            );

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountIn,
                helpers.fromWei(preview)
            );

            this.setPreviewPending(false);
            return {
                preview: {
                    outputAmount: preview,
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
        const proxy = this.rootStore.providerStore.getContract(
            ContractTypes.ExchangeProxyCallable,
            deployed['kovan'].proxy
        );

        console.log(
            '[Action] previewBatchSwapExactOut',
            tokenIn,
            tokenOut,
            tokenAmountOut
        );

        try {
            this.setPreviewPending(true);

            const poolData = await this.getPoolsWithToken(tokenIn, tokenOut);
            const costOutputToken = this.costCalculator.getCostOutputToken();

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty();
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty();

            let sorSwaps: SorSwaps = sor.linearizedSolution(
                poolData,
                'swapExactOut',
                tokenAmountOut,
                20,
                costOutputToken
            );

            let swaps: any[] = [];
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let swapAmount = sorSwaps.inputAmounts[i].toString();
                let swap = [
                    sorSwaps.selectedBalancers[i],
                    maxAmountIn,
                    helpers.toWei(swapAmount),
                    maxPrice,
                ];
                swaps.push(swap);
            }

            const preview = await proxy.batchSwapExactOut(
                swaps,
                tokenIn,
                tokenOut,
                helpers.toWei(tokenAmountOut),
                maxAmountIn
            );

            const effectivePrice = this.calcEffectivePrice(
                tokenAmountOut,
                helpers.fromWei(preview)
            );

            this.setPreviewPending(false);
            return {
                preview: {
                    inputAmount: preview,
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
