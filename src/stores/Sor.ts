import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import CostCalculator from '../utils/CostCalculator';
import { bnum, MAX_UINT, fromWei, toChecksum } from 'utils/helpers';
import { EtherKey } from './Token';
import {
    filterPoolsWithTokensDirect,
    smartOrderRouterMultiHop,
    filterPoolsWithTokensMultihop,
    getTokenPairsMultiHop,
    parsePoolData,
} from '@balancer-labs/sor';
import { BigNumber } from '../utils/bignumber';
import { SwapMethods } from './SwapForm';
import { TokenPairs } from './Pool';
import ContractMetadataStore from './ContractMetadata';

interface MultiSwap {
    pool: string;
    tokenInParam: string;
    tokenOutParam: string;
    maxPrice: string;
    swapAmount: string;
    limitReturnAmount: string;
    id?: string;
    decimalsIn?: number;
    decimalsOut?: number;
    balanceIn?: BigNumber;
    balanceOut?: BigNumber;
    weightIn?: BigNumber;
    weightOut?: BigNumber;
    swapFee?: BigNumber;
}

export interface SorMultiSwap {
    sequence: MultiSwap[];
}

// User SOR to find all swaps including multi-hop
export const findBestSwapsMulti = async (
    pools: any,
    pathData: any,
    tokenIn: string,
    tokenOut: string,
    swapType: SwapMethods,
    swapAmount: BigNumber,
    maxPools: number,
    returnTokenCostPerPool: BigNumber
): Promise<[BigNumber, any[][]]> => {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();

    console.log(
        `[SOR] findBestSwapsMulti: ${tokenIn} ${tokenOut} ${swapType} ${fromWei(
            swapAmount
        )} ${maxPools} ${fromWei(returnTokenCostPerPool)}`
    );

    // sorSwaps will return a nested array of swaps that can be passed to proxy
    const [sorSwaps, totalReturn] = smartOrderRouterMultiHop(
        JSON.parse(JSON.stringify(pools)),
        pathData,
        swapType,
        swapAmount,
        maxPools,
        returnTokenCostPerPool
    );

    return [totalReturn, sorSwaps];
};

export const getPathData = async (
    allPools: any,
    tokenIn: string,
    tokenOut: string
): Promise<any[]> => {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();

    const directPools = await filterPoolsWithTokensDirect(
        allPools,
        tokenIn,
        tokenOut
    );

    let mostLiquidPoolsFirstHop, mostLiquidPoolsSecondHop, hopTokens;
    [
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens,
    ] = await filterPoolsWithTokensMultihop(allPools, tokenIn, tokenOut);

    let pools, pathData;
    [pools, pathData] = parsePoolData(
        directPools,
        tokenIn,
        tokenOut,
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens
    );

    return [pools, pathData];
};

export const sorTokenPairs = async (
    tokenAddress: string,
    contractMetadataStore: ContractMetadataStore,
    allPools: any[]
): Promise<TokenPairs> => {
    let [, allTokenPairs] = await getTokenPairsMultiHop(tokenAddress, allPools);
    let tokenPairs: TokenPairs = new Set<string>();
    const sanitizedWeth = toChecksum(contractMetadataStore.getWethAddress());
    allTokenPairs.forEach(token => {
        const sanitizedToken = toChecksum(token);

        if (!tokenPairs.has(sanitizedToken)) {
            tokenPairs.add(sanitizedToken);
        }

        // Add Ether along with WETH
        if (sanitizedToken === sanitizedWeth && !tokenPairs.has(EtherKey)) {
            tokenPairs.add(EtherKey);
        }
    });

    return tokenPairs;
};

export default class SorStore {
    @observable pathData: any;
    @observable pools: any;
    costCalculator: CostCalculator;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.pathData = null;
        this.pools = null;
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });

        // TODO: Should we fetchPathData on a timer incase user has window open without refreshing?
    }

    @action async fetchPathData(inputToken, outputToken) {
        const { contractMetadataStore, poolStore } = this.rootStore;

        if (inputToken !== '' && outputToken !== '') {
            console.log(`[SOR] fetchPathData(${inputToken} ${outputToken})`);

            // Use WETH address for Ether
            if (inputToken === EtherKey)
                inputToken = contractMetadataStore.getWethAddress();

            if (outputToken === EtherKey)
                outputToken = contractMetadataStore.getWethAddress();

            if (
                poolStore.onchainPools.pools.length === 0 &&
                poolStore.subgraphPools.pools.length === 0
            ) {
                console.log(
                    `[SOR] fetchPathData, No Pools Loaded, Can't Fetch Paths`
                );
                return;
            } else if (
                poolStore.onchainPools.pools.length === 0 &&
                poolStore.subgraphPools.pools.length !== 0
            ) {
                console.log(
                    `[SOR] fetchPathData() Using Subgraph Until On-Chain Loaded`
                );
                let [pools, pathData] = await getPathData(
                    poolStore.subgraphPools,
                    inputToken,
                    outputToken
                );
                this.pools = pools;
                this.pathData = pathData;
            }
            // Waits for on-chain pools to finish loading
            await poolStore.poolsPromise;

            let [pools, pathData] = await getPathData(
                poolStore.onchainPools,
                inputToken,
                outputToken
            );
            this.pools = pools;
            this.pathData = pathData;
            console.log(`[SOR] fetchPathData() On-Chain Path Data Loaded`);
        }
    }

    @action formatSorSwaps = async (
        sorSwaps: any[][]
    ): Promise<SorMultiSwap[]> => {
        const { poolStore } = this.rootStore;

        let formattedSorSwaps: SorMultiSwap[] = [];

        let maxPrice = MAX_UINT.toString();
        let limitReturnAmount = '0';

        // If subgraph has failed we must wait for on-chain balance info to be loaded.
        if (poolStore.subgraphError) {
            console.log(`[SOR] Backup - Must Wait For On-Chain Balances.`);
            await poolStore.poolsPromise;
        }

        for (let i = 0; i < sorSwaps.length; i++) {
            let sequence = sorSwaps[i];
            let sorMultiSwap: SorMultiSwap = { sequence: [] };

            for (let j = 0; j < sequence.length; j++) {
                let swap = sequence[j];
                swap.maxPrice = maxPrice;
                swap.limitReturnAmount = limitReturnAmount;
                console.log(
                    `Swap:${i} Sequence:${j}, ${swap.pool}: ${swap.tokenIn}->${
                        swap.tokenOut
                    } Amt:${fromWei(swap.swapAmount)} maxPrice:${
                        swap.maxPrice
                    } limitReturn:${swap.limitReturnAmount}`
                );

                // Even if we use on-chain backup we need to get decimals from backup as not retrieved by SOR
                let pool = poolStore.findPoolTokenInfo(
                    swap.pool,
                    swap.tokenIn,
                    swap.tokenOut
                );

                let multiSwap: MultiSwap = {
                    pool: swap.pool,
                    tokenInParam: swap.tokenIn,
                    tokenOutParam: swap.tokenOut,
                    maxPrice: swap.maxPrice,
                    swapAmount: swap.swapAmount,
                    limitReturnAmount: swap.limitReturnAmount,
                    id: pool.id,
                    decimalsIn: pool.decimalsIn,
                    decimalsOut: pool.decimalsOut,
                    balanceIn: pool.balanceIn,
                    balanceOut: pool.balanceOut,
                    weightIn: pool.weightIn,
                    weightOut: pool.weightOut,
                    swapFee: pool.swapFee,
                };

                sorMultiSwap.sequence.push(multiSwap);
            }

            formattedSorSwaps.push(sorMultiSwap);
        }

        return formattedSorSwaps;
    };
}
