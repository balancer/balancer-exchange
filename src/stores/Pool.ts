import { action, observable } from 'mobx';
import { bnum } from 'utils/helpers';
import RootStore from 'stores/Root';
import CostCalculator from '../utils/CostCalculator';
import { EtherKey, UserAllowance } from './Token';
import { getTokenPairs } from '../utils/sorWrapper';
import { isChainIdSupported } from '../provider/connectors';
import {
    AsyncStatus,
    TokenPairsFetch,
    UserAllowanceFetch,
} from './actions/fetch';
import * as helpers from '../utils/helpers';

export type TokenPairs = Set<string>;

export interface TokenPairData {
    tokenPairs: TokenPairs;
    lastFetched: number;
}

interface TokenPairsMap {
    [index: number]: {
        [index: string]: TokenPairData;
    };
}

export default class PoolStore {
    @observable tokenPairs: TokenPairsMap;
    rootStore: RootStore;

    constructor(rootStore, supportedNetworks: number[]) {
        this.rootStore = rootStore;
        supportedNetworks.forEach(networkId => {
            this.tokenPairs = {};
            this.tokenPairs[networkId] = {};
        });
    }

    @action fetchAndSetTokenPairs(chainId, tokenAddress): void {
        this.fetchTokenPairs(chainId, tokenAddress).then(response => {
            const { status, request, payload } = response;
            if (status === AsyncStatus.SUCCESS) {
                this.setTokenPairs(
                    chainId,
                    request.tokenAddress,
                    payload.tokenPairs,
                    payload.lastFetched
                );
            }
        });
    }

    @action async fetchTokenPairs(chainId: number, tokenAddress: string) {
        const { tokenStore, providerStore } = this.rootStore;

        if (!isChainIdSupported(chainId)) {
            throw new Error(
                'Attempting to fetch token pairs for untracked chainId'
            );
        }

        const fetchBlock = providerStore.getCurrentBlockNumber(chainId);

        //Pre-fetch stale check
        const stale =
            fetchBlock <=
                this.getTokenPairsLastFetched(chainId, tokenAddress) &&
            fetchBlock !== -1;

        console.log({
            currentBlock: fetchBlock,
            lastFetched: this.getTokenPairsLastFetched(chainId, tokenAddress),
        });

        if (!stale) {
            const tokenAddressToFind =
                tokenAddress === EtherKey
                    ? tokenStore.getWethAddress(chainId)
                    : tokenAddress;

            const tokenPairs = await getTokenPairs(
                tokenAddressToFind,
                tokenStore.getWethAddress(chainId)
            );

            console.log('[Token Pairs Fetch] - Success', {
                chainId,
                tokenAddress,
                tokenPairs,
                fetchBlock,
            });
            return new TokenPairsFetch({
                status: AsyncStatus.SUCCESS,
                request: {
                    chainId,
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
                chainId,
                tokenAddress,
                fetchBlock,
            });
            return new TokenPairsFetch({
                status: AsyncStatus.STALE,
                request: {
                    chainId,
                    tokenAddress,
                    fetchBlock,
                },
                payload: undefined,
            });
        }
    }

    getTokenPairsLastFetched(chainId: number, tokenAddress: string): number {
        this.verifyChainId(chainId);

        if (this.tokenPairs[chainId][tokenAddress]) {
            return this.tokenPairs[chainId][tokenAddress].lastFetched;
        }

        return -1;
    }

    getTokenPairs(chainId, tokenAddress): TokenPairs | undefined {
        this.verifyChainId(chainId);

        if (this.tokenPairs[chainId][tokenAddress]) {
            return this.tokenPairs[chainId][tokenAddress].tokenPairs;
        }

        return undefined;
    }

    @action setTokenPairs(
        chainId: number,
        tokenAddress: string,
        tokenPairs: Set<string>,
        fetchBlock: number
    ): void {
        this.verifyChainId(chainId);

        this.tokenPairs[chainId][tokenAddress] = {
            tokenPairs,
            lastFetched: fetchBlock,
        };

        console.log('[setTokenPairs]', {
            chainId,
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
            pairs: this.tokenPairs[chainId][tokenAddress],
        });
        return !!this.tokenPairs[chainId][tokenAddress];
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
