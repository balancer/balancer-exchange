import { BigNumber } from 'utils/bignumber';

export default class CostCalculator {
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
