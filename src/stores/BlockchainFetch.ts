import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import { supportedChainId } from '../provider/connectors';

export default class BlockchainFetchStore {
    @observable activeFetchLoop: any;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
    }

    @action setFetchLoop(
        web3React: Web3ReactContextInterface,
        forceFetch?: boolean
    ) {
        if (
            web3React.active &&
            web3React.account &&
            web3React.chainId === supportedChainId
        ) {
            const { library, account, chainId } = web3React;
            const { providerStore, tokenStore } = this.rootStore;

            library
                .getBlockNumber()
                .then(blockNumber => {
                    const lastCheckedBlock = providerStore.getCurrentBlockNumber(
                        web3React.chainId
                    );

                    // console.debug('[Fetch Loop] Staleness Evaluation', {
                    //     blockNumber,
                    //     lastCheckedBlock,
                    //     forceFetch,
                    //     account: web3React.account,
                    //     doFetch: blockNumber !== lastCheckedBlock || forceFetch,
                    // });

                    const doFetch =
                        blockNumber !== lastCheckedBlock || forceFetch;

                    if (doFetch) {
                        console.log('[Fetch Loop] Fetch Blockchain Data', {
                            blockNumber,
                            chainId,
                            account,
                        });

                        // Set block number
                        providerStore.setCurrentBlockNumber(
                            chainId,
                            blockNumber
                        );

                        // Get global blockchain data
                        // None

                        // Get user-specific blockchain data
                        if (account) {
                            providerStore.fetchUserBlockchainData(
                                web3React,
                                chainId,
                                account
                            );
                        }
                    }
                })
                .catch(error => {
                    console.log('[Fetch Loop Failure]', {
                        web3React,
                        providerStore,
                        forceFetch,
                        chainId,
                        account,
                        library,
                        error,
                    });
                    providerStore.setCurrentBlockNumber(chainId, undefined);
                });
        }
    }
}
