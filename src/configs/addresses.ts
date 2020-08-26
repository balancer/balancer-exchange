import registry from 'assets/generated/dex/registry.homestead.json';
import registryKovan from 'assets/generated/dex/registry.kovan.json';
import * as deployed from '../deployed.json';
import { getSupportedChainName } from '../provider/connectors';

const chainName = getSupportedChainName();

const metadata = (deployed as any).default[chainName];
const contracts = {
    bFactory: metadata.bFactory,
    proxy: metadata.proxy,
    weth: metadata.weth,
    multicall: metadata.multicall,
};

let assets = {
    tokens: {},
    untrusted: [],
};
if (chainName === 'mainnet') {
    assets = registry;
}
if (chainName === 'kovan') {
    assets = registryKovan;
}

export { contracts, assets };
