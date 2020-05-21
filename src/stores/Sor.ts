import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { getPathData } from '../utils/sorWrapper';
import CostCalculator from '../utils/CostCalculator';
import { bnum } from 'utils/helpers';
import { SwapMethods } from './SwapForm';
import { EtherKey } from './Token';

export default class SorStore {
    @observable pathData: any;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.pathData = { swapin: null, swapout: null };
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });
    }

    @action async fetchPathData(inputToken, outputToken) {
        const { contractMetadataStore } = this.rootStore;

        if (inputToken && outputToken) {
            // Use WETH address for Ether
            if (inputToken === EtherKey)
                inputToken = contractMetadataStore.getWethAddress();

            if (outputToken === EtherKey)
                outputToken = contractMetadataStore.getWethAddress();

            getPathData(inputToken, outputToken, SwapMethods.EXACT_IN).then(
                response => {
                    this.pathData.swapin = response;
                }
            );

            getPathData(inputToken, outputToken, SwapMethods.EXACT_OUT).then(
                response => {
                    this.pathData.swapout = response;
                }
            );
        }
    }
}
