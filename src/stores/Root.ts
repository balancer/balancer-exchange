// Stores
import ProxyStore from 'stores/Proxy';
import ProviderStore from 'stores/Provider';
import SwapFormStore from 'stores/SwapForm';
import TokenStore from 'stores/Token';

export class RootStore {
    proxyStore: ProxyStore;
    providerStore: ProviderStore;
    swapFormStore: SwapFormStore;
    tokenStore: TokenStore;

    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.asyncSetup();
    }

    asyncSetup = async () => {
        await this.providerStore.setWeb3WebClient();
    };
}

const store = new RootStore();
export default store;
