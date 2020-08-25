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
import AssetOptionsStore from './AssetOptions';
import SorStore from './Sor';

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
    assetOptionsStore: AssetOptionsStore;
    sorStore: SorStore;
    errorStore: ErrorStore;

    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.poolStore = new PoolStore(this);
        this.providerStore = new ProviderStore(this);
        this.blockchainFetchStore = new BlockchainFetchStore(this);
        this.contractMetadataStore = new ContractMetadataStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.dropdownStore = new DropdownStore(this);
        this.transactionStore = new TransactionStore(this);
        this.appSettingsStore = new AppSettingsStore(this);
        this.assetOptionsStore = new AssetOptionsStore(this);
        this.sorStore = new SorStore(this);
        this.errorStore = new ErrorStore(this);

        this.asyncSetup().catch(e => {
            //TODO: Add retry on these fetches
            throw new Error('Async Setup Failed ' + e);
        });
    }

    async asyncSetup() {
        await this.providerStore.loadWeb3();
        this.swapFormStore.setDefaultTokenAddresses(
            this.providerStore.providerStatus.account
        );
        this.poolStore.loadPoolsList();
        this.blockchainFetchStore.blockchainFetch(false);
        // Load on-chain data as soon as a provider is available
    }
}
