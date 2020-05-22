import { BigNumber } from './bignumber';
import { calcSpotPrice, bmul, bdiv } from './balancerCalcs';
import * as helpers from './helpers';
import { bnum, scale, fromWei, MAX_UINT, toChecksum } from './helpers';
import {
    getPoolsWithTokens,
    smartOrderRouterMultiHop,
    getMultihopPoolsWithTokens,
    parsePoolData,
    getTokenPairsMultiHop,
} from '@balancer-labs/sor';
import { SwapMethods } from '../stores/SwapForm';
import { Pool, SorMultiSwap, MultiSwap } from '../stores/Proxy';
import { TokenPairs } from '../stores/Pool';
import { EtherKey } from '../stores/Token';
import ContractMetadataStore from '../stores/ContractMetadata';

// Finds pools with tokens & loads the balance/weight info for those
export const findPoolSpotPrice = async (
    allPools: any[],
    poolId: string,
    tokenIn: string,
    tokenOut: string
): Promise<BigNumber> => {
    const pool = allPools.find(
        p => helpers.toChecksum(p.id) === helpers.toChecksum(poolId)
    );
    if (!pool) {
        throw new Error(
            '[Invariant] No pool found for selected balancer index'
        );
    }

    let tI: any = pool.tokens.find(
        t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenIn)
    );
    let tO: any = pool.tokens.find(
        t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenOut)
    );

    let obj: Pool;

    if (tI.balance > 0 && tO.balance > 0) {
        obj = {
            id: helpers.toChecksum(pool.id),
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
        `!!!!!!! swap pool ${obj.id}, BalIn: ${fromWei(
            obj.balanceIn
        )}, WeightIn: ${fromWei(obj.weightIn)}, BalOut: ${fromWei(
            obj.balanceOut
        )}, WeightOut: ${fromWei(obj.weightOut)}`
    );

    const spotPrice = calcSpotPrice(
        obj.balanceIn,
        obj.weightIn,
        obj.balanceOut,
        obj.weightOut,
        obj.swapFee
    );

    return spotPrice;
};

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
): Promise<[SorMultiSwap[], BigNumber, any[][]]> => {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();

    console.log(
        `!!!!!!! findBestSwapsMulti: ${tokenIn} ${tokenOut} ${swapType} ${fromWei(
            swapAmount
        )} ${maxPools} ${fromWei(returnTokenCostPerPool)}`
    );

    // sorSwaps will return a nested array of swaps that can be passed to proxy
    const [sorSwaps, totalReturn] = smartOrderRouterMultiHop(
        pools,
        pathData,
        swapType,
        swapAmount,
        maxPools,
        returnTokenCostPerPool
    );

    let formattedSorSwaps: SorMultiSwap[] = [];

    // !!!!!!! changed to fix error in SOR return
    let maxPrice = MAX_UINT.toString();
    let limitReturnAmount = '0';

    if (swapType === SwapMethods.EXACT_IN) {
        console.log(
            `${fromWei(swapAmount)} ${tokenIn} -> ${fromWei(
                totalReturn
            )} ${tokenOut} Sequences:`
        );
    } else {
        limitReturnAmount = MAX_UINT.toString();
        console.log(
            `${fromWei(totalReturn)} ${tokenIn} -> ${fromWei(
                swapAmount
            )} ${tokenOut} Sequences:`
        );
    }

    sorSwaps.forEach((sequence, i) => {
        let sorMultiSwap: SorMultiSwap = { sequence: [] };
        sequence.forEach((swap, j) => {
            swap.maxPrice = maxPrice;
            swap.limitReturnAmount = limitReturnAmount;
            console.log(
                `Swap:${i} Sequence:${j}, ${swap.pool}: ${swap.tokenIn}->${
                    swap.tokenOut
                } Amt:${fromWei(swap.swapAmount)} maxPrice:${
                    swap.maxPrice
                } limitReturn:${swap.limitReturnAmount}`
            );

            let multiSwap: MultiSwap = {
                pool: swap.pool,
                tokenInParam: swap.tokenIn,
                tokenOutParam: swap.tokenOut,
                maxPrice: swap.maxPrice,
                swapAmount: swap.swapAmount,
                limitReturnAmount: swap.limitReturnAmount,
            };

            sorMultiSwap.sequence.push(multiSwap);
        });

        formattedSorSwaps.push(sorMultiSwap);
    });

    return [formattedSorSwaps, totalReturn, sorSwaps];
};

export const getPathData = async (
    tokenIn: string,
    tokenOut: string,
    swapType: SwapMethods
): Promise<any[]> => {
    tokenIn = tokenIn.toLowerCase();
    tokenOut = tokenOut.toLowerCase();

    const directPools = await getPoolsWithTokens(tokenIn, tokenOut);

    let mostLiquidPoolsFirstHop, mostLiquidPoolsSecondHop, hopTokens;
    [
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens,
    ] = await getMultihopPoolsWithTokens(tokenIn, tokenOut);

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
    const sanitizedWeth = helpers.toChecksum(
        contractMetadataStore.getWethAddress()
    );
    allTokenPairs.forEach(token => {
        const sanitizedToken = helpers.toChecksum(token);

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

export const calcPrice = (amountIn, amountOut) => {
    console.log('[calcPrice]', {
        amountIn: amountIn.toString(),
        amountOut: amountOut.toString(),
        price: amountIn.div(amountOut).toString(),
    });
    return amountIn.div(amountOut);
};

export const calcExpectedSlippage = (
    spotPrice: BigNumber,
    effectivePrice: BigNumber
) => {
    const spotPercentage = spotPrice.div(effectivePrice).times(100);
    console.log('[calcExpectedSlippage]', {
        spotPrice: spotPrice.toString(),
        effectivePrice: effectivePrice.toString(),
        spotPercentage: spotPercentage.toString(),
        expectedSlippage: bnum(100)
            .minus(spotPercentage)
            .toString(),
    });

    return bnum(100).minus(spotPercentage);
};

export const calcTotalSpotValue = async (
    method: SwapMethods,
    swaps: SorMultiSwap[],
    allPools: any[]
): Promise<BigNumber> => {
    let totalValue = bnum(0);
    console.log(`!!!!!!! calcTotalSpotValue(). ${swaps.length} Swaps.`);

    for (let i = 0; i < swaps.length; i++) {
        let sorMultiSwap = swaps[i];

        let spotPrices = [];
        // for each swap in sequence calculate spot price. spot price of sequence is product of all spot prices.
        for (let j = 0; j < sorMultiSwap.sequence.length; j++) {
            let swap = sorMultiSwap.sequence[j];
            console.log(
                `!!!!!! Checking Swap:${i} Sequence:${j}, ${swap.pool}: ${
                    swap.tokenInParam
                }->${swap.tokenOutParam} Amount:${fromWei(swap.swapAmount)}`
            );

            console.time(`findPoolSpotPrice`);
            const spotPrice = await findPoolSpotPrice(
                allPools,
                swap.pool,
                swap.tokenInParam,
                swap.tokenOutParam
            );
            console.timeEnd(`findPoolSpotPrice`);
            console.log(`!!!!!!! pool spotPrice:`, fromWei(spotPrice));
            spotPrices.push(spotPrice);
        }

        console.log(`!!!!!!! Sequence SpotPrices: ${spotPrices}`);
        const spotPrice = spotPrices.reduce((a, b) => bmul(a, b));
        console.log(
            `!!!!!!! Sequence SpotPrice Product: ${fromWei(spotPrice)}`
        );

        if (method === SwapMethods.EXACT_IN) {
            const swapAmount = sorMultiSwap.sequence[0].swapAmount;
            totalValue = totalValue.plus(bdiv(bnum(swapAmount), spotPrice));
        } else if (method === SwapMethods.EXACT_OUT) {
            let swapAmount = sorMultiSwap.sequence[0].swapAmount;

            if (sorMultiSwap.sequence.length > 1)
                swapAmount = sorMultiSwap.sequence[1].swapAmount;

            totalValue = totalValue.plus(bmul(bnum(swapAmount), spotPrice));
        }
    }
    console.log(`!!!!!!! totalValue: ${fromWei(totalValue)}`);
    return totalValue;
};

export const calcMinAmountOut = (
    spotValue: BigNumber,
    slippagePercent: BigNumber
): BigNumber => {
    const result = spotValue
        .minus(spotValue.times(slippagePercent.div(100)))
        .integerValue(); // TODO - fix this to be fully integer math

    console.log('[Min Out]', {
        spotValue: spotValue.toString(),
        slippagePercent: slippagePercent.toString(),
        results: spotValue
            .minus(spotValue.times(slippagePercent.div(100)))
            .toString(),
    });

    return result.gt(0) ? result : bnum(0);
};

export const calcMaxAmountIn = (
    spotValue: BigNumber,
    slippagePercent: BigNumber
): BigNumber => {
    const result = spotValue
        .plus(spotValue.times(slippagePercent.div(100)))
        .integerValue(); // TODO - fix this to be fully integer math

    console.log('[Max In]', {
        spotValue: spotValue.toString(),
        slippagePercent: slippagePercent.toString(),
        results: result.toString(),
    });
    return result;
};
