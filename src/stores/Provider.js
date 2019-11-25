import { observable, action } from 'mobx'
import * as blockchain from '../utils/blockchain'

export default class ProviderStore {
    @observable provider = false;
    @observable accounts = [];
    @observable defaultAccount = null;

    constructor(rootStore) {
        this.rootStore = rootStore;
    }

    setNetwork = async () => {
        try {
            await this.setAccount();
        } catch (e) {
            console.log(e);
        }
    }

    setAccount = async () => {
        const accounts = await blockchain.getAccounts()
        const account = await blockchain.getDefaultAccountByIndex(0);
        await blockchain.setDefaultAccount(account);

        this.accounts = accounts
        this.defaultAccount = account

        const poolStore = this.rootStore.poolStore

        if (poolStore.hasCurrentPool()) {
            this.rootStore.setDataUpdateInterval(poolStore.getCurrentPool(), account)
        }
    }

    getDefaultAccount = () => {
        return blockchain.getDefaultAccount()
    }

    // Web3 web client
    @action setWeb3WebClient = async () => {
        console.log('[Set] Setting Web3 Client')
        try {
            await blockchain.setWebClientProvider();
            await this.setNetwork();
        } catch (e) {
            console.log(e);
        }
    }
}