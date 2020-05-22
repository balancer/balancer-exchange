import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { EtherKey } from './Token';
import { sorTokenPairs } from '../utils/sorWrapper';
import { supportedChainId } from '../provider/connectors';
import { AsyncStatus, TokenPairsFetch } from './actions/fetch';
import { getPools } from '@balancer-labs/sor';

export type TokenPairs = Set<string>;

export interface TokenPairData {
    tokenPairs: TokenPairs;
    lastFetched: number;
}

interface TokenPairsMap {
    [index: string]: TokenPairData;
}

export default class PoolStore {
    @observable tokenPairs: TokenPairsMap;
    @observable allPools: [];
    @observable poolsLoaded: boolean;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.tokenPairs = {};
        this.allPools = [];
        this.poolsLoaded = false;
    }

    @action async fetchAllPools() {
        const allPools = await getPools();
        this.allPools = allPools.pools;
        this.poolsLoaded = true;
        console.log(`!!!!!!! ALLPOOLS LOADED`, this.allPools);
    }

    @action fetchAndSetTokenPairs(tokenAddress): void {
        this.fetchTokenPairs(tokenAddress).then(response => {
            const { status, request, payload } = response;
            if (status === AsyncStatus.SUCCESS) {
                this.setTokenPairs(
                    request.tokenAddress,
                    payload.tokenPairs,
                    payload.lastFetched
                );
            }
        });
    }

    @action async fetchTokenPairs(tokenAddress: string) {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const fetchBlock = providerStore.getCurrentBlockNumber();

        this.fetchAllPools();

        //Pre-fetch stale check
        const stale =
            fetchBlock <= this.getTokenPairsLastFetched(tokenAddress) &&
            fetchBlock !== -1;

        console.log({
            currentBlock: fetchBlock,
            lastFetched: this.getTokenPairsLastFetched(tokenAddress),
        });

        if (!stale) {
            const tokenAddressToFind =
                tokenAddress === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenAddress;

            if (!this.poolsLoaded) await this.fetchAllPools();

            const tokenPairs = await sorTokenPairs(
                tokenAddressToFind,
                contractMetadataStore,
                this.allPools
            );

            console.log('[Token Pairs Fetch] - Success', {
                tokenAddress,
                tokenPairs,
                fetchBlock,
            });
            return new TokenPairsFetch({
                status: AsyncStatus.SUCCESS,
                request: {
                    chainId: supportedChainId,
                    tokenAddress,
                    fetchBlock,
                },
                payload: {
                    tokenPairs: tokenPairs,
                    lastFetched: fetchBlock,
                },
            });
        } else {
            console.log('[Token Pairs Fetch] - Stale', {
                tokenAddress,
                fetchBlock,
            });
            return new TokenPairsFetch({
                status: AsyncStatus.STALE,
                request: {
                    chainId: supportedChainId,
                    tokenAddress,
                    fetchBlock,
                },
                payload: undefined,
            });
        }
    }

    getTokenPairsLastFetched(tokenAddress: string): number {
        if (this.tokenPairs[tokenAddress]) {
            return this.tokenPairs[tokenAddress].lastFetched;
        }

        return -1;
    }

    getTokenPairs(tokenAddress): TokenPairs | undefined {
        if (this.tokenPairs[tokenAddress]) {
            return this.tokenPairs[tokenAddress].tokenPairs;
        }

        return undefined;
    }

    @action setTokenPairs(
        tokenAddress: string,
        tokenPairs: Set<string>,
        fetchBlock: number
    ): void {
        this.tokenPairs[tokenAddress] = {
            tokenPairs,
            lastFetched: fetchBlock,
        };

        console.log('[setTokenPairs]', {
            tokenAddress,
            tokenPairs,
            fetchBlock,
            allTokenPairs: { ...this.tokenPairs },
        });
    }

    areTokenPairsLoaded(chainId, tokenAddress: string): boolean {
        this.verifyChainId(chainId);

        console.log('[are token pairs loaded?', {
            tokenAddress,
            pairs: this.tokenPairs[tokenAddress],
        });
        return !!this.tokenPairs[tokenAddress];
    }

    isTokenPairTradable(chainId, fromToken: string, toToken: string): boolean {
        this.verifyChainId(chainId);

        if (!this.areTokenPairsLoaded(chainId, fromToken)) {
            throw new Error(
                `Token pair data for ${fromToken} on network ${chainId} not loaded`
            );
        }

        return this.tokenPairs[chainId][fromToken].tokenPairs.has(toToken);
    }

    private verifyChainId(chainId) {
        if (!this.tokenPairs[chainId]) {
            throw new Error(
                'Attempting to access token pairs for non-supported chainId'
            );
        }
    }
}
