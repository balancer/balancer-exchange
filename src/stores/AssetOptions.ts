import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import { EtherKey } from '../stores/Token';
import * as ethers from 'ethers';
import { bnum, formatBalanceTruncated } from 'utils/helpers';

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

        let iconAddress;

        try {
            iconAddress = tokenStore.fetchTokenIconAddress(address);
        } catch (err) {
            this.tokenAssetData = undefined;
            return;
        }

        if (address === EtherKey) {
            const { contractMetadataStore, providerStore } = this.rootStore;
            const library = providerStore.providerStatus.library;
            const balanceWei = await library.getBalance(account);
            const balanceFormatted = formatBalanceTruncated(
                bnum(balanceWei),
                18,
                4,
                20
            );

            this.tokenAssetData = {
                address: address,
                iconAddress: 'ether',
                symbol: 'ETH',
                userBalance: balanceFormatted,
                isTradable: true,
            };

            return;
        } else {
            try {
                // symbol/decimal call will fail if not an actual token.
                const { providerStore, contractMetadataStore } = this.rootStore;

                const tokenContract = providerStore.getContract(
                    ContractTypes.TestToken,
                    address
                );

                const tokenDecimals = await tokenContract.decimals();

                let tokenSymbol;
                try {
                    tokenSymbol = await tokenContract.symbol();
                } catch (err) {
                    console.log('[Token] Trying TokenBytes');
                    const tokenContractBytes = providerStore.getContract(
                        ContractTypes.TestTokenBytes,
                        address
                    );

                    const tokenSymbolBytes = await tokenContractBytes.symbol();
                    tokenSymbol = ethers.utils.parseBytes32String(
                        tokenSymbolBytes
                    );
                }

                const precision = contractMetadataStore.getWhiteListedTokenPrecision(
                    address
                );

                const balanceWei = await tokenContract.balanceOf(account);
                const balanceFormatted = formatBalanceTruncated(
                    bnum(balanceWei),
                    tokenDecimals,
                    precision,
                    20
                );

                this.tokenAssetData = {
                    address: address,
                    iconAddress: iconAddress,
                    symbol: tokenSymbol,
                    userBalance: balanceFormatted,
                    isTradable: true,
                };
            } catch (error) {
                this.tokenAssetData = undefined;
                return;
            }
        }
    };
}
