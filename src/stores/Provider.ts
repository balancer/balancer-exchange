import { observable, action } from 'mobx';
import { injected, network } from 'provider/connectors'
import * as blockchain from 'utils/blockchain';
import { RootStore } from 'stores/Root';

export default class ProviderStore {
    @observable provider: any;
    @observable accounts: string[];
    @observable defaultAccount: string | null;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
    }
}
