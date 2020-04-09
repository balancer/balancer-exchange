// Stores
import ProxyStore from 'stores/Proxy';
import ProviderStore from 'stores/Provider';
import BlockchainFetchStore from 'stores/BlockchainFetch';
import SwapFormStore from 'stores/SwapForm';
import TokenStore from 'stores/Token';
import DropdownStore from './Dropdown';
import ErrorStore from './Error';
import ContractMetadataStore from './ContractMetadata';
import TransactionStore from './Transaction';
import AppSettingsStore from './AppSettings';
import PoolStore from './Pool';

export default class RootStore {
    proxyStore: ProxyStore;
    providerStore: ProviderStore;
    blockchainFetchStore: BlockchainFetchStore;
    swapFormStore: SwapFormStore;
    tokenStore: TokenStore;
    poolStore: PoolStore;
    dropdownStore: DropdownStore;
    contractMetadataStore: ContractMetadataStore;
    transactionStore: TransactionStore;
    appSettingsStore: AppSettingsStore;
    errorStore: ErrorStore;

    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this);
        this.blockchainFetchStore = new BlockchainFetchStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.poolStore = new PoolStore(this);
        this.dropdownStore = new DropdownStore(this);
        this.contractMetadataStore = new ContractMetadataStore(this);
        this.transactionStore = new TransactionStore(this);
        this.appSettingsStore = new AppSettingsStore(this);
        this.errorStore = new ErrorStore(this);

        this.asyncSetup().catch(e => {
            //TODO: Add retry on these fetches
            throw new Error('Async Setup Failed ' + e);
        });
    }

    async asyncSetup() {
        await this.providerStore.loadWeb3();
    }
}
