import * as allPools from 'allPublicPools.json';

// Replicates SOR Subgraph getAllPublicSwapPools using allPublicPools.json
export function getAllPublicSwapPoolsBackup(): any {
    let poolData = { pools: [] };

    allPools.pools.forEach(p => {
        if (p.publicSwap && p.finalized) poolData.pools.push(p);
    });

    return poolData;
}
