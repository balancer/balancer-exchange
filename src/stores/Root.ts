// Stores
import ProxyStore from 'stores/Proxy';
import ProviderStore from 'stores/Provider';
import SwapFormStore from 'stores/SwapForm';
import TokenStore from 'stores/Token';
import ModalStore from "./Modal";
import TransactionStore from "./Transaction";
import {supportedNetworks} from 'provider/connectors'
import AppSettingsStore from "./AppSettings";

export default class RootStore {
    proxyStore: ProxyStore;
    providerStore: ProviderStore;
    swapFormStore: SwapFormStore;
    tokenStore: TokenStore;
    modalStore: ModalStore;
    transactionStore: TransactionStore;
    appSettingsStore: AppSettingsStore;

    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.modalStore = new ModalStore(this);
        this.transactionStore = new TransactionStore(this, supportedNetworks);
        this.appSettingsStore = new AppSettingsStore(this);
    }
}
