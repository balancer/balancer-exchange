import fetch from 'isomorphic-fetch';
import * as allPools from 'allPublicPools.json';
import { SUBGRAPH_URL } from 'provider/connectors';

// Returns all public pools
export async function getAllPublicSwapPools() {
    let pools = { pools: [] };
    try {
        pools = await getSubgraphPools();
        if (pools.pools.length === 0) {
            console.log(
                `[SubGraph] Load Error - No Pools Returned. Defaulting To Backup List.`
            );
            pools.pools = allPools.pools;
        }
    } catch (error) {
        console.log(`[SubGraph] Load Error. Defaulting To Backup List.`);
        console.log(`[SubGraph] Error: ${error.message}`);
        pools.pools = allPools.pools;
    }

    return pools;
}

async function getSubgraphPools() {
    const query = `
      {
          pools0: pools (first: 1000, where: {publicSwap: true, active: true}) {
            id
            swapFee
            totalWeight
            publicSwap
            tokens {
              id
              address
              balance
              decimals
              symbol
              denormWeight
            }
            tokensList
          },
          pools1000: pools (first: 1000, skip: 1000, where: {publicSwap: true, active: true}) {
            id
            swapFee
            totalWeight
            publicSwap
            tokens {
              id
              address
              balance
              decimals
              symbol
              denormWeight
            }
            tokensList
          }
      }
    `;

    const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
        }),
    });

    const { data } = await response.json();
    let pools = data.pools0.concat(data.pools1000);
    console.log(`[SubGraph] Number Of Pools: ${pools.length}`);
    return { pools: pools };
}
