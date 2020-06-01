import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { EtherKey } from './Token';
import { sorTokenPairs } from './Sor';
import { supportedChainId } from '../provider/connectors';
import { AsyncStatus, TokenPairsFetch } from './actions/fetch';
import { getAllPublicSwapPools } from '@balancer-labs/sor';
import { getAllPublicSwapPoolsBackup } from '../utils/poolsBackup';
import { BigNumber } from 'utils/bignumber';
import { toChecksum, scale, bnum, fromWei } from 'utils/helpers';

export type TokenPairs = Set<string>;

export interface TokenPairData {
    tokenPairs: TokenPairs;
    lastFetched: number;
}

export interface Pool {
    id: string;
    decimalsIn: number;
    decimalsOut: number;
    balanceIn: BigNumber;
    balanceOut: BigNumber;
    weightIn: BigNumber;
    weightOut: BigNumber;
    swapFee: BigNumber;
}

interface TokenPairsMap {
    [index: string]: TokenPairData;
}

export default class PoolStore {
    @observable tokenPairs: TokenPairsMap;
    @observable allPools: any;
    @observable subgraphError: boolean;
    poolsPromise: Promise<void>;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.poolsPromise = this.fetchAllPools();
        this.tokenPairs = {};
        this.allPools = { pools: [] };
        this.subgraphError = false;
    }

    // TODO: Should this be fetched on a timer to update?
    @action async fetchAllPools() {
        try {
            const allPools = await getAllPublicSwapPools();
            this.subgraphError = false;
            this.allPools = allPools;
            console.log(`[Pool] Subgraph All Pools Loaded`, this.allPools);
        } catch (err) {
            this.subgraphError = true;
            console.log(
                `[Pool] Issue Loading Subgraph pools. Defaulting to backup.`
            );
            this.allPools = getAllPublicSwapPoolsBackup();
        }
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

            // First page load we need to wait for all pools loaded from Subgraph
            // TO DO: Should we put all pools load on timer loop?
            await this.poolsPromise;

            const tokenPairs = await sorTokenPairs(
                tokenAddressToFind,
                contractMetadataStore,
                this.allPools.pools
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

    // Finds pools with tokens & loads the balance/weight info for those
    findPoolTokenInfo = (
        poolId: string,
        tokenIn: string,
        tokenOut: string
    ): Pool => {
        const pool = this.allPools.pools.find(
            p => toChecksum(p.id) === toChecksum(poolId)
        );
        if (!pool) {
            throw new Error(
                '[Invariant] No pool found for selected balancer index'
            );
        }

        let tI: any = pool.tokens.find(
            t => toChecksum(t.address) === toChecksum(tokenIn)
        );
        let tO: any = pool.tokens.find(
            t => toChecksum(t.address) === toChecksum(tokenOut)
        );

        let obj: Pool;

        if (tI.balance > 0 && tO.balance > 0) {
            obj = {
                id: toChecksum(pool.id),
                decimalsIn: tI.decimals,
                decimalsOut: tO.decimals,
                balanceIn: scale(bnum(tI.balance), tI.decimals),
                balanceOut: scale(bnum(tO.balance), tO.decimals),
                weightIn: scale(
                    bnum(tI.denormWeight).div(bnum(pool.totalWeight)),
                    18
                ),
                weightOut: scale(
                    bnum(tO.denormWeight).div(bnum(pool.totalWeight)),
                    18
                ),
                swapFee: scale(bnum(pool.swapFee), 18),
            };
        }

        console.log(
            `Pool ${obj.id}, BalIn: ${fromWei(
                obj.balanceIn
            )}, WeightIn: ${fromWei(obj.weightIn)}, BalOut: ${fromWei(
                obj.balanceOut
            )}, WeightOut: ${fromWei(obj.weightOut)}`
        );
        return obj;
    };
}
