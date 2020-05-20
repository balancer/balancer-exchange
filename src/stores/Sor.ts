import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { getPathData } from '../utils/sorWrapper';
import CostCalculator from '../utils/CostCalculator';
import { bnum, scale, fromWei } from 'utils/helpers';
import { SwapMethods } from './SwapForm';
import { EtherKey } from './Token';

export default class SorStore {
    @observable pathData: any;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.pathData = {};
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });
    }

    @action async fetchPathData() {
        const { swapFormStore, contractMetadataStore } = this.rootStore;

        let inputToken = swapFormStore.inputToken.address;
        let outputToken = swapFormStore.outputToken.address;

        if (inputToken && outputToken) {
            // Use WETH address for Ether
            if (inputToken === EtherKey)
                inputToken = contractMetadataStore.getWethAddress();

            if (outputToken === EtherKey)
                outputToken = contractMetadataStore.getWethAddress();

            const pathDataExactIn = await getPathData(
                inputToken,
                outputToken,
                SwapMethods.EXACT_IN
            );

            const pathDataExactOut = await getPathData(
                inputToken,
                outputToken,
                SwapMethods.EXACT_OUT
            );

            this.pathData = {
                swapin: pathDataExactIn,
                swapout: pathDataExactOut,
            };
        }
    }
}
