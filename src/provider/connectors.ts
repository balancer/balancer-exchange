import { InjectedConnector } from '@web3-react/injected-connector';
import { NetworkConnector } from 'provider/NetworkConnector';

const POLLING_INTERVAL = 10000;
const RPC_URLS: { [chainId: number]: string } = {
    1: process.env.REACT_APP_RPC_URL_1 as string,
    42: process.env.REACT_APP_RPC_URL_42 as string,
};

export const backup = new NetworkConnector({
    urls: {
        1: RPC_URLS[1],
        42: RPC_URLS[42],
    },
    defaultChainId: 42,
    pollingInterval: POLLING_INTERVAL,
});

export const injected = new InjectedConnector({
    supportedChainIds: [1, 42],
});

export default {
    backup,
    injected,
};
