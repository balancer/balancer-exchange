import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import * as deployed from 'deployed.json';
import { getSupportedChainName } from '../provider/connectors';

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    weth: string;
    multicall: string;
    defaultPrecision: number;
    tokens: TokenMetadata[];
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    decimals: number;
    iconAddress: string;
    precision: number;
    isSupported: boolean;
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
        const chainName = getSupportedChainName();
        const metadata = JSON.parse(JSON.stringify(deployed));
        const tokenMetadata = metadata.default[chainName].tokens;

        const contractMetadata = {
            bFactory: metadata.default[chainName].bFactory,
            proxy: metadata.default[chainName].proxy,
            weth: metadata.default[chainName].weth,
            multicall: metadata.default[chainName].multicall,
            defaultPrecision: metadata.default[chainName].defaultPrecision,
            tokens: [] as TokenMetadata[],
        };

        tokenMetadata.forEach(token => {
            const { address, symbol, iconAddress, precision } = token;
            contractMetadata.tokens.push({
                address,
                symbol,
                decimals: undefined,
                iconAddress,
                precision,
                isSupported: true,
            });
        });

        this.contractMetadata = contractMetadata;
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

    // Used for asset options
    getFilteredTokenMetadata(filter: string): TokenMetadata[] {
        const tokens = this.contractMetadata.tokens || undefined;

        if (!tokens) {
            throw new Error(
                'Attempting to get user balances for untracked chainId'
            );
        }

        let filteredMetadata: TokenMetadata[] = [];

        if (filter.indexOf('0x') === 0) {
            //Search by address
            filteredMetadata = tokens.filter(value => {
                return value.address === filter;
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
        const tokens = this.contractMetadata.tokens;
        return tokens.map(token => token.address);
    }

    getWhiteListedTokenIcon(address: string): string {
        const tokenList = this.contractMetadata.tokens.filter(
            token => token.isSupported
        );
        const tokenUrl = tokenList.find(t => t.address === address);
        if (tokenUrl) return tokenUrl.iconAddress;
        else return 'unknown';
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
