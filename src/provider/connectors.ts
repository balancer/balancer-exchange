import { InjectedConnector } from '@web3-react/injected-connector';
import { NetworkConnector } from 'provider/NetworkConnector';

const POLLING_INTERVAL = 10000;

export const backup = new NetworkConnector({
    urls: { 1: 'https://kovan.infura.io/v3/cd282052becb4c26ae80ce3aee65aa0c' },
    pollingInterval: POLLING_INTERVAL,
});

export const injected = new InjectedConnector({
    supportedChainIds: [1],
});

export default {
    backup,
  injected
}