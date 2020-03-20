import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import { supportedChainId } from '../provider/connectors';
import { InputValidationStatus, SwapMethods } from './SwapForm';

export default class BlockchainFetchStore {
    @observable activeFetchLoop: any;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
    }

    @action blockchainFetch(
        web3React: Web3ReactContextInterface,
        accountSwitchOverride?: boolean
    ) {
        if (
            web3React.active &&
            web3React.account &&
            web3React.chainId === supportedChainId
        ) {
            const { library, account, chainId } = web3React;
            const { providerStore } = this.rootStore;

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
                        blockNumber !== lastCheckedBlock ||
                        accountSwitchOverride;

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
                            providerStore
                                .fetchUserBlockchainData(
                                    web3React,
                                    chainId,
                                    account
                                )
                                .then(results => {
                                    // Update preview when account changes
                                    if (accountSwitchOverride) {
                                        this.updateSwapPreviewForActiveAccount(
                                            web3React
                                        );
                                    }
                                });
                        }
                    }
                })
                .catch(error => {
                    console.log('[Fetch Loop Failure]', {
                        web3React,
                        providerStore,
                        forceFetch: accountSwitchOverride,
                        chainId,
                        account,
                        library,
                        error,
                    });
                    providerStore.setCurrentBlockNumber(chainId, undefined);
                });
        }
    }

    updateSwapPreviewForActiveAccount(web3React: Web3ReactContextInterface) {
        const { swapFormStore } = this.rootStore;

        const { swapMethod, inputAmount, outputAmount } = swapFormStore.inputs;

        if (swapMethod === SwapMethods.EXACT_IN) {
            const inputStatus = swapFormStore.validateSwapValue(inputAmount);
            if (inputStatus === InputValidationStatus.VALID) {
                swapFormStore.refreshExactAmountInPreview();
            } else {
                swapFormStore.refreshInvalidInputAmount(
                    inputAmount,
                    inputStatus
                );
            }
        } else if (swapMethod === SwapMethods.EXACT_OUT) {
            const inputStatus = swapFormStore.validateSwapValue(outputAmount);
            if (inputStatus === InputValidationStatus.VALID) {
                swapFormStore.refreshExactAmountOutPreview();
            } else {
                swapFormStore.refreshInvalidOutputAmount(
                    outputAmount,
                    inputStatus
                );
            }
        }
    }
}
