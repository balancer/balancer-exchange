import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { EtherKey } from './Token';
import { sorTokenPairs } from './Sor';
import { supportedChainId } from '../provider/connectors';
import { AsyncStatus, TokenPairsFetch } from './actions/fetch';
import { getAllPoolDataOnChain } from '@balancer-labs/sor';
import { getAllPublicSwapPoolsBackup } from '../utils/poolsBackup';
import { BigNumber } from 'utils/bignumber';
import { toChecksum, scale, bnum, fromWei } from 'utils/helpers';
import { getAllPublicSwapPools } from 'utils/subGraph';

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
    @observable onChainPools: any;
    poolsList: any;
    onChainPoolsPromise: Promise<void>;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.tokenPairs = {};
        this.poolsList = { pools: [] };
        this.onChainPools = { pools: [] };
    }

    async loadOnChain() {
        this.onChainPoolsPromise = this.loadOnChainPools();
    }

    // TODO: Should this be fetched on a timer to update? See Root.ts for order
    async loadPoolsList() {
        if (this.poolsList.pools.length === 0) {
            console.log(`[Pool] Loading Backup Pools`);
            this.poolsList = getAllPublicSwapPoolsBackup();
            this.loadOnChain();
            console.log(`[Pool] Backup Pools Loaded`);
        }

        console.log(`[Pool] Loading Subgraph Pools`);
        //this.poolsList = await getAllPublicSwapPools();
        getAllPublicSwapPools()
            .then(response => {
                if (this.poolsList.pools.length !== response.pools.length) {
                    console.log(`[Pool] Subgraph Pools Loaded With New Info.`);
                    this.poolsList = response;
                } else {
                    console.log(`[Pool] Subgraph Pools Loaded.`);
                }
                // Load on-chain info every time to keep balances fresh
                this.loadOnChain(); // THIS CAN FREEZE UI??
            })
            .catch(err => {
                console.log(`[Pool] Subgraph Loading Issue. Using Backup.`);
                console.log(err);
            });
    }

    // TODO: Should this be fetched on a timer to update? See Root.ts for order
    @action private async loadOnChainPools() {
        try {
            const {
                providerStore,
                contractMetadataStore,
                sorStore,
                swapFormStore,
            } = this.rootStore;
            const library = providerStore.providerStatus.library;
            console.log(`[Pool] Loading On-Chain Pool Info...`);
            await this.onChainPoolsPromise; // Pause if already loading info

            /*
            REMOVED THIS AS ONLY WANT TO USE ONCHAIN BALANCES FOR EVERYTHING
            console.log(`[Pool] Fetch paths while waiting for onchain...`);
            // This function will use Subgraph for paths and wait until on-chain pools are loaded then use those
            sorStore.fetchPathData(
                swapFormStore.inputToken.address,
                swapFormStore.outputToken.address
            );
            */
            console.log(`[Pool] Loading Pool On-chain Balances`);
            const onChainPoolsFresh = await getAllPoolDataOnChain(
                this.poolsList,
                contractMetadataStore.getMultiAddress(),
                library
            );

            if (!onChainPoolsFresh) {
                console.log(`Error loading on-chain, default to Subgraph`);
                this.onChainPools = this.poolsList;
            } else this.onChainPools = onChainPoolsFresh;

            sorStore.fetchPathData(
                swapFormStore.inputToken.address,
                swapFormStore.outputToken.address
            );

            this.fetchAndSetTokenPairs(swapFormStore.inputToken.address);
            this.fetchAndSetTokenPairs(swapFormStore.outputToken.address);

            console.log(`[Pool] All On-chain Pools Loaded`, this.onChainPools);
        } catch (err) {
            console.log(err.message);
            console.log(
                `[Pool] Issue Loading OnChain pools. Defaulting to Subgraph.`
            );
            this.onChainPools = this.poolsList;
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

        if (!stale) {
            const tokenAddressToFind =
                tokenAddress === EtherKey
                    ? contractMetadataStore.getWethAddress()
                    : tokenAddress;

            // First page load we need to wait for all pools loaded from Subgraph
            // Subgraph will be loaded quicker than on-chain pools & assume this
            // data is fine to use for token pairs as no balances required
            // TO DO: Should we put all pools load on timer loop?
            console.log(`[Pool] Loading Pairs ${tokenAddressToFind}`);
            const tokenPairs = await sorTokenPairs(
                tokenAddressToFind,
                contractMetadataStore,
                this.poolsList
            );

            console.log('[Pool] - TokenPairs Success', {
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
        // Use Subgraph pools as a backup until on-chain loaded
        let pool;

        if (this.onChainPools.pools.length === 0) {
            pool = this.poolsList.pools.find(
                p => toChecksum(p.id) === toChecksum(poolId)
            );
        } else {
            pool = this.onChainPools.pools.find(
                p => toChecksum(p.id) === toChecksum(poolId)
            );
        }

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
