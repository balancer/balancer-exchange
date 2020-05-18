import { BigNumber } from './bignumber';
import { calcInGivenOut, calcSpotPrice, bmul, bdiv } from './balancerCalcs';
import * as helpers from './helpers';
import { bnum, scale } from './helpers';
import {
    getPoolsWithToken,
    getPoolsWithTokens,
    smartOrderRouterMultiHop,
    getMultihopPoolsWithTokens,
    parsePoolData,
    getTokenPairsMultiHop,
} from '@balancer-labs/sor';
import { SwapMethods } from '../stores/SwapForm';
import { Pool, SorSwap, Swap, SorMultiSwap, MultiSwap } from '../stores/Proxy';
import { TokenPairs } from '../stores/Pool';
import { EtherKey } from '../stores/Token';
import ContractMetadataStore from '../stores/ContractMetadata';

export const formatSwapsExactAmountOut = (
    sorSwaps: SorSwap[],
    poolData: Pool[],
    maxPrice: BigNumber,
    maxAmountIn: BigNumber
): Swap[] => {
    const swaps: Swap[] = [];
    for (let i = 0; i < sorSwaps.length; i++) {
        let swapAmount = sorSwaps[i].amount;
        let swap: Swap = {
            pool: sorSwaps[i].pool,
            tokenInParam: maxAmountIn.toString(),
            tokenOutParam: swapAmount.toString(),
            maxPrice: maxPrice.toString(),
        };
        swaps.push(swap);
    }
    return swaps;
};

export const findPoolsWithTokens = async (
    tokenIn: string,
    tokenOut: string
): Promise<Pool[]> => {
    let pools = await getPoolsWithTokens(tokenIn, tokenOut);
    // console.log(`!!!!!!! getPoolsWithTokens`, pools);

    if (pools.pools.length === 0)
        throw Error('There are no pools with selected tokens');

    let poolData: Pool[] = [];
    pools.pools.forEach(p => {
        let tI: any = p.tokens.find(
            t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenIn)
        );
        let tO: any = p.tokens.find(
            t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenOut)
        );

        if (tI.balance > 0 && tO.balance > 0) {
            let obj: Pool = {
                id: helpers.toChecksum(p.id),
                decimalsIn: tI.decimals,
                decimalsOut: tO.decimals,
                balanceIn: scale(bnum(tI.balance), tI.decimals),
                balanceOut: scale(bnum(tO.balance), tO.decimals),
                weightIn: scale(
                    bnum(tI.denormWeight).div(bnum(p.totalWeight)),
                    18
                ),
                weightOut: scale(
                    bnum(tO.denormWeight).div(bnum(p.totalWeight)),
                    18
                ),
                swapFee: scale(bnum(p.swapFee), 18),
            };

            poolData.push(obj);
        }
    });
    return poolData;
};

const formatPoolsWithTokens = async (
    tokenIn,
    tokenOut,
    pools
): Promise<Pool[]> => {
    if (pools.length === 0)
        throw Error('There are no pools with selected tokens');

    let poolData: Pool[] = [];
    pools.forEach(p => {
        let tI: any = p.tokens.find(
            t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenIn)
        );

        if (!tI) {
            tI = {
                balance: 0,
                decimals: 0,
                denormWeight: 0,
            };
        }

        let tO: any = p.tokens.find(
            t => helpers.toChecksum(t.address) === helpers.toChecksum(tokenOut)
        );

        if (!tO) {
            tO = {
                balance: 0,
                decimals: 0,
                denormWeight: 0,
            };
        }

        let obj: Pool = {
            id: helpers.toChecksum(p.id),
            decimalsIn: tI.decimals,
            decimalsOut: tO.decimals,
            balanceIn: scale(bnum(tI.balance), tI.decimals),
            balanceOut: scale(bnum(tO.balance), tO.decimals),
            weightIn: scale(bnum(tI.denormWeight).div(bnum(p.totalWeight)), 18),
            weightOut: scale(
                bnum(tO.denormWeight).div(bnum(p.totalWeight)),
                18
            ),
            swapFee: scale(bnum(p.swapFee), 18),
        };

        poolData.push(obj);
    });

    return poolData;
};

export const findBestSwapsMulti = async (
    tokenIn: string,
    tokenOut: string,
    swapType: SwapMethods,
    swapAmount: BigNumber,
    maxPools: number,
    returnTokenCostPerPool: BigNumber
): Promise<[SorMultiSwap[], BigNumber, any[][]]> => {
    const data = await getPoolsWithTokens(tokenIn, tokenOut);
    const directPools = data.pools;

    let mostLiquidPoolsFirstHop, mostLiquidPoolsSecondHop, hopTokens;
    [
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens,
    ] = await getMultihopPoolsWithTokens(tokenIn, tokenOut);

    const pathData = parsePoolData(
        directPools,
        tokenIn,
        tokenOut,
        mostLiquidPoolsFirstHop,
        mostLiquidPoolsSecondHop,
        hopTokens
    );

    // sorSwaps will return a nested array of swaps that can be passed to proxy
    const [sorSwaps, totalReturn] = smartOrderRouterMultiHop(
        pathData,
        swapType,
        swapAmount,
        maxPools,
        returnTokenCostPerPool
    );

    let formattedSorSwaps: SorMultiSwap[] = [];

    if (swapType === SwapMethods.EXACT_IN)
        console.log(
            `SwapExactIn: ${swapAmount}->${totalReturn.toString()}, Multi-Swap Sequences:`
        );
    else
        console.log(
            `SwapExactOut: ${totalReturn.toString()}->${swapAmount}, Multi-Swap Sequences:`
        );

    sorSwaps.forEach((sequence, i) => {
        let sorMultiSwap: SorMultiSwap = { sequence: [] };
        sequence.forEach((swap, j) => {
            console.log(
                `Swap:${i} Sequence:${j}, ${swap.pool}: ${swap.tokenIn}->${swap.tokenOut} Amt:${swap.swapAmount} maxPrice:${swap.maxPrice} limitReturn:${swap.limitReturnAmount}`
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

export const sorTokenPairs = async (
    tokenAddress: string,
    contractMetadataStore: ContractMetadataStore
): Promise<TokenPairs> => {
    let [, allTokenPairs] = await getTokenPairsMultiHop(tokenAddress);

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
    swaps: SorMultiSwap[]
): Promise<BigNumber> => {
    let totalValue = bnum(0);
    console.log(`!!!!!!! calcTotalSpotValue. ${swaps.length} Swaps.`);
    for (let i = 0; i < swaps.length; i++) {
        let sorMultiSwap = swaps[i];

        let spotPrices = [];
        // for each swap in sequence calculate spot price. spot price of sequence is product of all spot prices.
        for (let j = 0; j < sorMultiSwap.sequence.length; j++) {
            let swap = sorMultiSwap.sequence[j];
            console.log(
                `!!!!!! Checking Swap:${i} Sequence:${j}, ${swap.pool}: ${swap.tokenInParam}->${swap.tokenOutParam} Amount:${swap.swapAmount}`
            );

            const poolData = await findPoolsWithTokens(
                swap.tokenInParam,
                swap.tokenOutParam
            );

            // console.log(`!!!!!!! poolData: `, poolData);

            const pool = poolData.find(
                p => helpers.toChecksum(p.id) === helpers.toChecksum(swap.pool)
            );
            if (!pool) {
                throw new Error(
                    '[Invariant] No pool found for selected balancer index'
                );
            }

            console.log(
                `!!!!!!! swap pool ${
                    pool.id
                }, BalIn: ${pool.balanceIn.toString()}, WeightIn: ${pool.weightIn.toString()}, BalOut: ${pool.balanceOut.toString()}, WeightOut: ${pool.weightOut.toString()}`
            );

            const spotPrice = calcSpotPrice(
                pool.balanceIn,
                pool.weightIn,
                pool.balanceOut,
                pool.weightOut,
                pool.swapFee
            );
            console.log(`!!!!!!! pool spotPrice:`, spotPrice.toString());

            spotPrices.push(spotPrice);
        }

        console.log(`!!!!!!! Sequence SpotPrices: ${spotPrices}`);
        const spotPrice = spotPrices.reduce((a, b) => bmul(a, b));
        console.log(`!!!!!!! Sequence SpotPrice Product: ${spotPrice}`);

        if (method === SwapMethods.EXACT_IN) {
            const swapAmount = sorMultiSwap.sequence[0].swapAmount;
            totalValue = totalValue.plus(bdiv(bnum(swapAmount), spotPrice));
        } else if (method === SwapMethods.EXACT_OUT) {
            const swapAmount = sorMultiSwap.sequence[1].swapAmount;
            totalValue = totalValue.plus(bmul(bnum(swapAmount), spotPrice));
        }
    }
    console.log(`!!!!!!! totalValue: ${totalValue}`);
    return totalValue;
};

/* Go through selected swaps and determine the total input */
export const calcTotalInput = (
    swaps: Swap[],
    poolData: Pool[],
    maxPrice: string,
    maxAmountIn: string
): BigNumber => {
    try {
        let totalAmountIn = bnum(0);
        swaps.forEach(swap => {
            const swapAmount = swap.tokenOutParam;
            const pool = poolData.find(p => p.id === swap.pool);
            if (!pool) {
                throw new Error(
                    '[Invariant] No pool found for selected balancer index'
                );
            }

            const preview = calcInGivenOut(
                pool.balanceIn,
                pool.weightIn,
                pool.balanceOut,
                pool.weightOut,
                bnum(swapAmount),
                pool.swapFee
            );

            totalAmountIn = totalAmountIn.plus(preview);
        });

        return totalAmountIn;
    } catch (e) {
        throw new Error(e);
    }
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
