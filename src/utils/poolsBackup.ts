import { Web3Provider } from 'ethers/providers';
import { parsePoolDataOnChain } from '@balancer-labs/sor';
import { Pool } from '../stores/Proxy';
import { toChecksum } from './helpers';
import * as allPools from 'allPublicPools.json';

// Replicates Subgraph Subgraph getPoolsWithTokens retrieval using allPublicPools.json
function getPoolsWithTokensBackup(tokenIn: string, tokenOut: string): any {
    let poolData = { pools: [] };

    allPools.pools.forEach(p => {
        let tI: any = p.tokens.find(
            t => toChecksum(t.address) === toChecksum(tokenIn)
        );
        let tO: any = p.tokens.find(
            t => toChecksum(t.address) === toChecksum(tokenOut)
        );

        if (tI && tO && p.finalized) poolData.pools.push(p);
    });

    return poolData;
}

export async function findPoolsWithTokensBackup(
    tokenIn: string,
    tokenOut: string,
    provider: Web3Provider,
    multiAddress: string
): Promise<Pool[]> {
    const pools = getPoolsWithTokensBackup(tokenIn, tokenOut);

    let poolsWithTokens = await parsePoolDataOnChain(
        pools.pools,
        tokenIn,
        tokenOut,
        multiAddress,
        provider
    );

    let poolsWithBalances = [];

    // Current SOR doesn't return decimals or check balances so filter locally
    poolsWithTokens.forEach(pool => {
        if (pool.balanceIn.gt(0) && pool.balanceOut.gt(0)) {
            let subgraphPool = pools.pools.find(
                p => toChecksum(p.id) === toChecksum(pool.id)
            );

            let tI: any = subgraphPool.tokens.find(
                t => toChecksum(t.address) === toChecksum(tokenIn)
            );
            let tO: any = subgraphPool.tokens.find(
                t => toChecksum(t.address) === toChecksum(tokenOut)
            );

            let obj: Pool = {
                id: toChecksum(pool.id),
                decimalsIn: tI.decimals,
                decimalsOut: tO.decimals,
                balanceIn: pool.balanceIn,
                balanceOut: pool.balanceOut,
                weightIn: pool.weightIn,
                weightOut: pool.weightOut,
                swapFee: pool.swapFee,
            };

            poolsWithBalances.push(obj);
        }
    });

    return poolsWithBalances;
}

// Replicates Subgraph Subgraph getTokenPairs retrieval using allPublicPools.json
export function getTokenPairsBackup(token: string): any {
    let poolData = { pools: [] };

    allPools.pools.forEach(p => {
        if (p.publicSwap && p.finalized) {
            let tI: any = p.tokensList.find(
                t => toChecksum(t) === toChecksum(token)
            );

            if (tI) {
                poolData.pools.push({ tokensList: p.tokensList });
            }
        }
    });

    return poolData;
}
