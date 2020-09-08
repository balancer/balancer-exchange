import { observable } from 'mobx';
import RootStore from 'stores/Root';
import { getAllPoolDataOnChain } from '@balancer-labs/sor';
import { BigNumber } from 'utils/bignumber';
import { toChecksum, scale, bnum, fromWei } from 'utils/helpers';
import { getAllPublicSwapPools } from 'utils/subGraph';
import { utils } from 'ethers';

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

export default class PoolStore {
    @observable onChainPools: any;
    private poolsList: any;
    rootStore: RootStore;
    fetchingOnChain: boolean;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.poolsList = { pools: [] };
        this.onChainPools = { pools: [] };
        this.fetchingOnChain = false;
    }

    async fetchPools(onChainBalances = false) {
        console.log(`[Pool] Fetching Pools ${onChainBalances}`);

        this.poolsList = await getAllPublicSwapPools();

        if (onChainBalances) {
            this.fetchOnChainBalances();
        }
    }

    async fetchOnChainBalances() {
        const {
            providerStore,
            contractMetadataStore,
            sorStore,
            swapFormStore,
        } = this.rootStore;

        if (!this.fetchingOnChain) {
            this.fetchingOnChain = true;
            console.log(`[Pool] Fetching Onchain Balances`);

            const library = providerStore.providerStatus.library;

            try {
                this.onChainPools = await getAllPoolDataOnChain(
                    this.poolsList,
                    contractMetadataStore.getMultiAddress(),
                    library
                );
            } catch (error) {
                console.log(`[Pool] Error While Loading On-Chain Pools.`);
                console.log(error.message);
                this.onChainPools = { pools: [] };
            }

            if (
                swapFormStore.inputToken.address &&
                swapFormStore.outputToken.address
            ) {
                console.log(`[Pool] Loading Path Data`);
                sorStore.fetchPathData(
                    swapFormStore.inputToken.address,
                    swapFormStore.outputToken.address,
                    true
                );
            }

            this.fetchingOnChain = false;
        }
    }

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
