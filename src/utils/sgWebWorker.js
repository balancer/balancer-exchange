import {
    filterPoolsWithTokensDirect,
    filterPoolsWithTokensMultihop,
    getTokenPairsMultiHop,
    parsePoolData,
    processPaths,
    processEpsOfInterestMultiHop,
    smartOrderRouterMultiHopEpsOfInterest,
} from '@balancer-labs/sor';

onmessage = function(oEvent) {
    console.log('worker.js: Message received from main script');
    self.postMessage('Hellloooo vietnam');
    test(oEvent.data);
    // this.postMessage('Hello main')
};

const test = async allPools => {
    let timer = null;
    const minutes = 5;
    let tokenIn = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    let tokenOut = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

    const directPools = await filterPoolsWithTokensDirect(
        JSON.parse(allPools),
        tokenIn,
        tokenOut
    );

    console.log(`@@@@@@@ directPools`);
    console.log(directPools);
};

// exports.test = test;
