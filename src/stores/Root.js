// Stores
import PoolStore from "./Pool";
import ProxyStore from "./Proxy";
import ProviderStore from "./Provider";
import SwapFormStore from "./SwapForm"
import TokenStore from "./Token"
import UtilStore from "./Util"

class RootStore {
    constructor() {
        this.poolStore = new PoolStore(this);
        this.proxyStore = new ProxyStore(this);
        this.providerStore = new ProviderStore(this);
        this.swapFormStore = new SwapFormStore(this);
        this.tokenStore = new TokenStore(this);
        this.utilStore = new UtilStore(this);
        this.asyncSetup()
    }

    asyncSetup = async () => {
        await this.providerStore.setWeb3WebClient()
    }

    setDataUpdateInterval = async (poolAddress, userAddress) => {
        this.dataUpdateInterval = setInterval(async () => {
            console.log(`data update for pool ${poolAddress}, for user ${userAddress}`)
        }, 2000);
    }

    // setPendingTxInterval = () => {
    //     this.pendingTxInterval = setInterval(() => {
    //         this.transactions.checkPendingTransactions();
    //     }, 10000);
    // }

    // loadContracts = () => {
    //     if (this.network.network && !this.network.stopIntervals) {
    //         blockchain.resetFilters(true);
    //         if (typeof this.pendingTxInterval !== "undefined") clearInterval(this.pendingTxInterval);
    //         const addrs = settings.chain[this.network.network];
    //         blockchain.loadObject("proxyregistry", addrs.proxyRegistry, "proxyRegistry");
    //         const setUpPromises = [blockchain.getProxy(this.network.defaultAccount)];
    //         Promise.all(setUpPromises).then(r => {
    //             this.system.init();
    //             this.network.stopLoadingAddress();
    //             this.profile.setProxy(r[0]);
    //             this.profile.loadAllowances();
    //             this.setPendingTxInterval();
    //         });
    //     }
    // }
}

const store = new RootStore();
export default store;
