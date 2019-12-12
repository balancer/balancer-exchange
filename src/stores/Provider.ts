import { observable, action } from 'mobx';
import * as blockchain from 'utils/blockchain';
import { RootStore } from 'stores/Root';

export default class ProviderStore {
    @observable provider: any;
    @observable accounts: string[];
    @observable defaultAccount: string | null;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.provider = false;
        this.accounts = [];
        this.defaultAccount = null;
    }

    setNetwork = async () => {
        try {
            await this.setAccount();
        } catch (e) {
            console.log(e);
        }
    };

    setAccount = async () => {
        const accounts = await blockchain.getAccounts();
        const account = await blockchain.getDefaultAccountByIndex(0);
        await blockchain.setDefaultAccount(account);

        this.accounts = accounts;
        this.defaultAccount = account;
    };

    getDefaultAccount = () => {
        return blockchain.getDefaultAccount();
    };

    // Web3 web client
    @action setWeb3WebClient = async () => {
        console.log('[Set] Setting Web3 Client');
        try {
            await blockchain.setWebClientProvider();
            await this.setNetwork();
        } catch (e) {
            console.log(e);
        }
    };
}
