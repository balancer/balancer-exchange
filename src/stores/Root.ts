// Stores
import ProxyStore from 'stores/Proxy';
import ProviderStore from 'stores/Provider';
import BlockchainFetchStore from 'stores/BlockchainFetch';
import SwapFormStore from 'stores/SwapForm';
import TokenStore from 'stores/Token';
import ModalStore from './Modal';
import ErrorStore from './Error';
import TransactionStore from './Transaction';
import { supportedNetworks } from 'provider/connectors';
import AppSettingsStore from './AppSettings';
import PoolStore from './Pool';

export default class RootStore {
    proxyStore: ProxyStore;
    providerStore: ProviderStore;
    blockchainFetchStore: BlockchainFetchStore;
    swapFormStore: SwapFormStore;
    tokenStore: TokenStore;
    poolStore: PoolStore;
    modalStore: ModalStore;
    transactionStore: TransactionStore;
    appSettingsStore: AppSettingsStore;
    errorStore: ErrorStore;

    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this, supportedNetworks);
        this.blockchainFetchStore = new BlockchainFetchStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this, supportedNetworks);
        this.poolStore = new PoolStore(this, supportedNetworks);
        this.modalStore = new ModalStore(this);
        this.transactionStore = new TransactionStore(this);
        this.appSettingsStore = new AppSettingsStore(this);
        this.errorStore = new ErrorStore(this);
    }
}
