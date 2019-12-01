// Stores
import ProxyStore from "./Proxy";
import ProviderStore from "./Provider";
import SwapFormStore from "./SwapForm"
import TokenStore from "./Token"

class RootStore {
    constructor() {
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.asyncSetup()
    }

    asyncSetup = async () => {
        await this.providerStore.setWeb3WebClient()
    }
}

const store = new RootStore();
export default store;
