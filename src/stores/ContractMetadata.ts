import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { contracts, assets } from 'configs';
import { BigNumber } from 'utils/bignumber';
import { toChecksum } from '../utils/helpers';
import { EtherKey } from './Token';

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    weth: string;
    multicall: string;
    tokens: TokenMetadata[];
    untrusted: string[];
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    hasIcon: boolean;
    precision: number;
    isSupported: boolean;
    allowance: BigNumber;
}

export default class ContractMetadataStore {
    @observable contractMetadata: ContractMetadata;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.contractMetadata = {} as ContractMetadata;
        this.loadWhitelistedTokenMetadata();
    }

    // Take the data from the JSON and get it into the store, so we access it just like other data
    @action loadWhitelistedTokenMetadata() {
        const { tokens, untrusted } = assets;

        const contractMetadata = {
            bFactory: contracts.bFactory,
            proxy: contracts.proxy,
            weth: contracts.weth,
            multicall: contracts.multicall,
            tokens: [] as TokenMetadata[],
            untrusted,
        };

        Object.keys(tokens).forEach(tokenAddress => {
            const token = tokens[tokenAddress];
            const { address, symbol, name, precision, hasIcon } = token;
            contractMetadata.tokens.push({
                address,
                symbol,
                name,
                decimals: 18,
                hasIcon,
                precision,
                isSupported: true,
                allowance: new BigNumber(0),
            });
        });

        this.contractMetadata = contractMetadata;
    }

    async addToken(tokenAddr, account) {
        const { tokenStore, swapFormStore } = this.rootStore;
        const existingTokens = this.contractMetadata.tokens || undefined;

        if (tokenAddr === EtherKey) return;

        let isToken = existingTokens.filter(value => {
            if (value.address === EtherKey) return false;
            return toChecksum(tokenAddr) === toChecksum(value.address);
        });

        if (isToken.length === 0) {
            console.log(`Adding TOken: ${tokenAddr}`);
            const tokenMetadata = await tokenStore.fetchOnChainTokenMetadata(
                tokenAddr,
                account
            );

            console.log(`Allowance: ${tokenMetadata.allowance.toString()}`);
            tokenStore.setBalances(
                [toChecksum(tokenAddr)],
                [tokenMetadata.balanceBn],
                account,
                20000
            );
            tokenStore.setAllowances(
                [tokenAddr],
                account,
                this.getProxyAddress(),
                [tokenMetadata.allowance],
                20000
            );

            this.contractMetadata.tokens.push({
                address: tokenAddr,
                symbol: tokenMetadata.symbol,
                name: tokenMetadata.name,
                decimals: tokenMetadata.decimals,
                hasIcon: tokenMetadata.hasIcon,
                precision: tokenMetadata.precision,
                isSupported: true,
                allowance: tokenMetadata.allowance,
            });

            swapFormStore.updateSelectedTokenMetaData(account);
        }
    }

    getProxyAddress(): string {
        const proxyAddress = this.contractMetadata.proxy;
        if (!proxyAddress) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return proxyAddress;
    }

    getWethAddress(): string {
        const address = this.contractMetadata.weth;
        if (!address) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return address;
    }

    getMultiAddress(): string {
        const multiAddress = this.contractMetadata.multicall;
        if (!multiAddress) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return multiAddress;
    }

    getUntrustedTokens(): string[] {
        return this.contractMetadata.untrusted;
    }

    // Used for asset options
    getFilteredTokenMetadata(filter: string): TokenMetadata[] {
        const tokens = this.contractMetadata.tokens || undefined;

        if (!tokens) {
            throw new Error(
                'Attempting to get user balances for untracked chainId'
            );
        }

        let filteredMetadata: TokenMetadata[] = [];

        if (filter === 'ether') {
            filteredMetadata = tokens.filter(value => {
                return value.address === filter;
            });
        } else if (filter.indexOf('0x') === 0) {
            //Search by address
            filteredMetadata = tokens.filter(value => {
                return value.address.toLowerCase() === filter.toLowerCase();
            });
        } else {
            //Search by symbol
            filteredMetadata = tokens.filter(value => {
                const valueString = value.symbol.toLowerCase();
                filter = filter.toLowerCase();
                return valueString.includes(filter);
            });
        }

        return filteredMetadata;
    }

    // Provider uses this to get balances
    getTrackedTokenAddresses(): string[] {
        const { assetOptionsStore } = this.rootStore;
        const tokens = this.contractMetadata.tokens;
        let tokenList = tokens.map(token => token.address);
        if (assetOptionsStore.tokenAssetData)
            tokenList.push(assetOptionsStore.tokenAssetData.address);

        return tokenList;
    }

    getWhiteListedTokenPrecision(address: string): number {
        const tokenList = this.contractMetadata.tokens.filter(
            token => token.isSupported
        );
        const tokenUrl = tokenList.find(t => t.address === address);
        if (tokenUrl) return tokenUrl.precision;
        else return 4;
    }

    getDaiAddress(): string {
        return this.contractMetadata.tokens.filter(
            token => token.isSupported
        )[1].address;
    }

    getEthAddress(): string {
        return this.contractMetadata.tokens.filter(
            token => token.isSupported
        )[0].address;
    }

    setTokenDecimals(address: string, decimals: number) {
        const tokenUrl = this.contractMetadata.tokens.find(
            t => t.address === address
        );
        if (tokenUrl) tokenUrl.decimals = decimals;
    }
}
