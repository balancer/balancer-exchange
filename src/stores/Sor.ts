import { action } from 'mobx';
import RootStore from 'stores/Root';
import CostCalculator from '../utils/CostCalculator';
import { bnum, fromWei, toChecksum } from 'utils/helpers';
import { EtherKey } from './Token';
import {
    filterPoolsWithTokensDirect,
    filterPoolsWithTokensMultihop,
    getTokenPairsMultiHop,
    parsePoolData,
    processPaths,
    processEpsOfInterestMultiHop,
    smartOrderRouterMultiHopEpsOfInterest,
    filterAllPools,
    getCostOutputToken,
} from '@balancer-labs/sor';
import { BigNumber } from '../utils/bignumber';
import { SwapMethods } from './SwapForm';
import { TokenPairs } from './Pool';
import ContractMetadataStore from './ContractMetadata';
// import { calcInGivenOut } from '../utils/balancerCalcs';

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

export const sorTokenPairs = async (
    tokenAddress: string,
    contractMetadataStore: ContractMetadataStore,
    allPools: any[]
): Promise<TokenPairs> => {
    let [allTokensSet] = filterAllPools(allPools);
    let [, allTokenPairs] = await getTokenPairsMultiHop(
        tokenAddress.toLowerCase(),
        allTokensSet
    );
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
    costCalculator: CostCalculator;
    private rootStore: RootStore;
    private processedPools: any;
    private processedPathsIn: any;
    private processedPathsOut: any;
    private epsOfInterestIn: any;
    private epsOfInterestOut: any;
    noPools: number;
    costOutputToken: BigNumber;
    costInputToken: BigNumber;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.processedPools = null;
        this.processedPathsIn = null;
        this.processedPathsOut = null;
        this.epsOfInterestIn = null;
        this.epsOfInterestOut = null;
        this.costCalculator = new CostCalculator({
            gasPrice: bnum(0),
            gasPerTrade: bnum(0),
            outTokenEthPrice: bnum(0),
        });
        this.noPools = Number(process.env.REACT_APP_MAX_POOLS || 4);
        this.costOutputToken = bnum(0);
        this.costInputToken = bnum(0);
        // TODO: Should we fetchPathData on a timer incase user has window open without refreshing?
    }

    @action async fetchPathData(inputToken, outputToken) {
        const {
            contractMetadataStore,
            poolStore,
            swapFormStore,
            providerStore,
            assetOptionsStore,
        } = this.rootStore;

        if (inputToken !== '' && outputToken !== '') {
            console.log(`[SOR] fetchPathData(${inputToken} ${outputToken})`);

            // Use WETH address for Ether
            if (inputToken === EtherKey)
                inputToken = contractMetadataStore.getWethAddress();

            if (outputToken === EtherKey)
                outputToken = contractMetadataStore.getWethAddress();

            if (
                poolStore.onChainPools.pools.length === 0 &&
                poolStore.poolsList.pools.length === 0
            ) {
                console.log(
                    `[SOR] fetchPathData, No Pools Loaded, Can't Fetch Paths`
                );
                return;
            }

            // Waits for on-chain pools to finish loading
            await poolStore.onChainPoolsPromise;

            await this.getPathData(
                poolStore.onChainPools,
                inputToken,
                outputToken
            );

            const library = providerStore.providerStatus.library;

            let filteredWhitelistedTokens = contractMetadataStore.getFilteredTokenMetadata(
                outputToken
            );

            let outPutTokenDecimals: number = 18;
            if (filteredWhitelistedTokens.length === 0) {
                if (assetOptionsStore.tokenAssetData) {
                    if (
                        assetOptionsStore.tokenAssetData.address === outputToken
                    ) {
                        outPutTokenDecimals = Number(
                            assetOptionsStore.tokenAssetData.decimals.toString()
                        );
                    }
                }
            } else {
                outPutTokenDecimals = Number(
                    filteredWhitelistedTokens[0].decimals.toString()
                );
            }

            this.costOutputToken = await this.getCostOutputToken(
                outputToken,
                outPutTokenDecimals,
                bnum(process.env.REACT_APP_GAS_PRICE || 30000000000),
                bnum(process.env.REACT_APP_SWAP_COST || 100000),
                library
            );

            filteredWhitelistedTokens = contractMetadataStore.getFilteredTokenMetadata(
                inputToken
            );

            let inputTokenDecimals: number = 18;
            if (filteredWhitelistedTokens.length === 0) {
                if (assetOptionsStore.tokenAssetData) {
                    if (
                        assetOptionsStore.tokenAssetData.address === inputToken
                    ) {
                        inputTokenDecimals = Number(
                            assetOptionsStore.tokenAssetData.decimals.toString()
                        );
                    }
                }
            } else {
                inputTokenDecimals = Number(
                    filteredWhitelistedTokens[0].decimals.toString()
                );
            }

            this.costInputToken = await this.getCostOutputToken(
                inputToken,
                inputTokenDecimals,
                bnum(process.env.REACT_APP_GAS_PRICE || 30000000000),
                bnum(process.env.REACT_APP_SWAP_COST || 100000),
                library
            );

            swapFormStore.showLoader = false;

            // This will update any existing input values for new paths
            const inputValue = swapFormStore.getActiveInputValue();
            swapFormStore.refreshSwapFormPreview(
                inputValue,
                swapFormStore.inputs.swapMethod
            );

            console.log(`[SOR] fetchPathData() On-Chain Path Data Loaded`);
        }
    }

    @action formatSorSwaps = async (
        sorSwaps: any[][]
    ): Promise<SorMultiSwap[]> => {
        const { poolStore } = this.rootStore;

        let formattedSorSwaps: SorMultiSwap[] = [];

        // let maxPrice = MAX_UINT.toString();
        // let limitReturnAmount = '0';
        // let limitReturnAmount = maxPrice;

        // If subgraph has failed we must wait for on-chain balance info to be loaded.
        if (poolStore.onChainPools.pools.length === 0) {
            console.log(`[SOR] Backup - Must Wait For On-Chain Balances.`);
            await poolStore.onChainPoolsPromise;
            console.log(`[SOR] Backup - On-Chain Balances Loaded.`);
        }

        let swapDebug = [];

        for (let i = 0; i < sorSwaps.length; i++) {
            let sequence = sorSwaps[i];
            let sorMultiSwap: SorMultiSwap = { sequence: [] };

            let seqDebug = [];

            for (let j = 0; j < sequence.length; j++) {
                let swap = sequence[j];
                seqDebug.push(swap);
                // swap.maxPrice = maxPrice;
                // swap.limitReturnAmount = limitReturnAmount;
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

                /*
                let inCheck = calcInGivenOut(
                    pool.balanceIn,
                    pool.weightIn,
                    pool.balanceOut,
                    pool.weightOut,
                    swap.swapAmount,
                    pool.swapFee
                )

                console.log(`!!!!!!! inCheck: ${fromWei(inCheck)}`)
                */

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

            swapDebug.push(seqDebug);

            formattedSorSwaps.push(sorMultiSwap);
        }

        console.log(swapDebug);

        return formattedSorSwaps;
    };

    private getPathData = async (
        Pools,
        InputToken,
        OutputToken
    ): Promise<void> => {
        let [pools, pathData] = await this.loadPathData(
            Pools,
            InputToken,
            OutputToken
        );

        this.processedPools = pools;
        this.processedPathsIn = processPaths(pathData, pools, 'swapExactIn');

        this.epsOfInterestIn = processEpsOfInterestMultiHop(
            this.processedPathsIn,
            'swapExactIn',
            this.noPools
        );

        this.processedPathsOut = processPaths(pathData, pools, 'swapExactOut');

        this.epsOfInterestOut = processEpsOfInterestMultiHop(
            this.processedPathsOut,
            'swapExactOut',
            this.noPools
        );
    };

    loadPathData = async (
        allPools: any,
        tokenIn: string,
        tokenOut: string
    ): Promise<any[]> => {
        tokenIn = tokenIn.toLowerCase();
        tokenOut = tokenOut.toLowerCase();

        let [, allPoolsNonZeroBalances] = filterAllPools(allPools);

        const directPools = await filterPoolsWithTokensDirect(
            allPoolsNonZeroBalances,
            tokenIn,
            tokenOut
        );

        let mostLiquidPoolsFirstHop, mostLiquidPoolsSecondHop, hopTokens;
        [
            mostLiquidPoolsFirstHop,
            mostLiquidPoolsSecondHop,
            hopTokens,
        ] = await filterPoolsWithTokensMultihop(
            allPoolsNonZeroBalances,
            tokenIn,
            tokenOut
        );

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

    // User SOR to find all swaps including multi-hop
    findBestSwapsMulti = async (
        swapType: SwapMethods,
        swapAmount: BigNumber,
        maxPools: number,
        returnTokenCostPerPool: BigNumber
    ): Promise<[BigNumber, any[][]]> => {
        let processedPaths = this.processedPathsIn;
        let epsOfInterest = this.epsOfInterestIn;

        if (swapType === SwapMethods.EXACT_OUT) {
            processedPaths = this.processedPathsOut;
            epsOfInterest = this.epsOfInterestOut;
        }

        const [sorSwaps, totalReturn] = smartOrderRouterMultiHopEpsOfInterest(
            JSON.parse(JSON.stringify(this.processedPools)),
            processedPaths,
            swapType,
            swapAmount,
            maxPools,
            returnTokenCostPerPool,
            epsOfInterest
        );

        return [totalReturn, sorSwaps];
    };

    getCostOutputToken = async (
        TokenAddr: string,
        TokenDecimals: number,
        GasPriceWei: BigNumber,
        SwapGasCost: BigNumber,
        Provider: any
    ): Promise<BigNumber> => {
        // console.log(`!!!!!!! COST: `, TokenAddr, TokenDecimals, GasPriceWei.toString(), SwapGasCost.toString())
        const cost = await getCostOutputToken(
            TokenAddr,
            TokenDecimals,
            GasPriceWei,
            SwapGasCost,
            Provider
        );
        console.log(`[SOR] costOutputToken: ${cost.toString()}`);
        return cost;
    };
}
