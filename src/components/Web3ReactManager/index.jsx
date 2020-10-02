import { useStores } from 'contexts/storesContext';
import { useInterval } from 'utils/helperHooks';
import { observer } from 'mobx-react';

const Web3Manager = observer(({ children }) => {
    const {
        root: { blockchainFetchStore, poolStore },
    } = useStores();

    //Fetch user blockchain data on an interval using current params
    blockchainFetchStore.blockchainFetch(false);
    useInterval(() => blockchainFetchStore.blockchainFetch(false), 2000);
    useInterval(() => poolStore.fetchPools(), 300000);
    useInterval(() => poolStore.fetchOnChainBalances(), 70000);

    return children;
});

export default Web3Manager;
