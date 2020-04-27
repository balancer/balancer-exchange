import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

interface Asset {
    address: string;
    iconAddress: string;
    symbol: string;
    userBalance: string;
    isTradable: boolean;
}

export default class AssetOptions {
    @observable tokenAssetData: Asset;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.tokenAssetData = undefined;
    }

    @action fetchTokenAssetData = async (address: string, account: string) => {
        console.log(`[AssetOptions] fetchTokenAssetData: ${address}`);

        const { tokenStore } = this.rootStore;

        try {
            const tokenMetadata = await tokenStore.fetchOnChainTokenMetadata(
                address,
                account
            );

            this.tokenAssetData = {
                address: tokenMetadata.address,
                iconAddress: tokenMetadata.iconAddress,
                symbol: tokenMetadata.tokenSymbol,
                userBalance: tokenMetadata.balanceFormatted,
                isTradable: true,
            };
        } catch (err) {
            this.tokenAssetData = undefined;
        }
    };
}
