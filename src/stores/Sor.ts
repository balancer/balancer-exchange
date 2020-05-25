import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { getPathData } from '../utils/sorWrapper';
import CostCalculator from '../utils/CostCalculator';
import { bnum } from 'utils/helpers';
import { EtherKey } from './Token';

export default class SorStore {
    @observable pathData: any;
    @observable pools: any;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.pathData = null;
        this.pools = null;
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });

        // TODO: Should we fetchPathData on a timer incase user has window open without refreshing?
    }

    @action async fetchPathData(inputToken, outputToken) {
        const { contractMetadataStore } = this.rootStore;

        if (inputToken !== '' && outputToken !== '') {
            console.log(`[SOR] fetchPathData(${inputToken} ${outputToken})`);

            // Use WETH address for Ether
            if (inputToken === EtherKey)
                inputToken = contractMetadataStore.getWethAddress();

            if (outputToken === EtherKey)
                outputToken = contractMetadataStore.getWethAddress();

            let [pools, pathData] = await getPathData(inputToken, outputToken);
            this.pools = pools;
            this.pathData = pathData;
            console.log(`[SOR] fetchPathData() Path Data Loaded`);
        }
    }
}
