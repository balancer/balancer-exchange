import { action, observable, ObservableMap } from 'mobx';
import RootStore from 'stores/Root';
import { ethers } from 'ethers';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import UncheckedJsonRpcSigner from 'provider/UncheckedJsonRpcSigner';
import { sendAction } from './actions/actions';
import { supportedChainId, web3ContextNames } from '../provider/connectors';

export enum ContractTypes {
    BPool = 'BPool',
    BFactory = 'BFactory',
    TestToken = 'TestToken',
    ExchangeProxy = 'ExchangeProxy',
    ExchangeProxyCallable = 'ExchangeProxyCallable',
}

export const schema = {
    BPool: require('../abi/BPool').abi,
    BFactory: require('../abi/BFactory').abi,
    TestToken: require('../abi/TestToken').abi,
    ExchangeProxy: require('../abi/ExchangeProxy').abi,
    ExchangeProxyCallable: require('../abi/ExchangeProxyCallable').abi,
};

export interface ChainData {
    currentBlockNumber: number;
}

enum ERRORS {
    UntrackedChainId = 'Attempting to access data for untracked chainId',
    ContextNotFound = 'Specified context name note stored',
    BlockchainActionNoAccount = 'Attempting to do blockchain transaction with no account',
    BlockchainActionNoChainId = 'Attempting to do blockchain transaction with no chainId',
    BlockchainActionNoResponse = 'No error or response received from blockchain action',
}

type ChainDataMap = ObservableMap<number, ChainData>;

export default class ProviderStore {
    @observable provider: any;
    @observable accounts: string[];
    @observable defaultAccount: string | null;
    @observable contexts: object;
    @observable blockNumber: number;
    @observable supportedNetworks: number[];
    @observable chainData: ChainDataMap;
    @observable activeChainId: number;
    @observable activeFetchLoop: any;
    @observable activeAccount: string;
    rootStore: RootStore;

    constructor(rootStore, networkIds: number[]) {
        this.rootStore = rootStore;
        this.contexts = {};
        this.supportedNetworks = networkIds;
        this.chainData = new ObservableMap<number, ChainData>();

        networkIds.forEach(networkId => {
            this.chainData.set(networkId, {
                currentBlockNumber: -1,
            });
        });
    }

    private safeGetChainData(chainId): ChainData {
        const chainData = this.chainData.get(chainId);
        if (!chainData) {
            throw new Error(ERRORS.UntrackedChainId);
        }
        return chainData;
    }

    getCurrentBlockNumber(chainId): number {
        const chainData = this.safeGetChainData(chainId);
        return chainData.currentBlockNumber;
    }

    @action setCurrentBlockNumber(chainId, blockNumber): void {
        const chainData = this.safeGetChainData(chainId);
        chainData.currentBlockNumber = blockNumber;
    }

    @action setActiveAccount(account: string) {
        this.activeAccount = account;
    }

    @action fetchUserBlockchainData = async (
        web3React: Web3ReactContextInterface,
        chainId: number,
        account: string
    ) => {
        const { transactionStore, tokenStore } = this.rootStore;

        console.debug('[Fetch Start - User Blockchain Data]', {
            chainId,
            account,
        });

        transactionStore.checkPendingTransactions(web3React, chainId, account);
        tokenStore
            .fetchBalancerTokenData(web3React, account, chainId)
            .then(result => {
                console.debug('[Fetch End - User Blockchain Data]', {
                    chainId,
                    account,
                });
            });
    };

    // account is optional
    getProviderOrSigner(library, account) {
        console.debug('[getProviderOrSigner', {
            library,
            account,
            signer: library.getSigner(account),
        });

        return account
            ? new UncheckedJsonRpcSigner(library.getSigner(account))
            : library;
    }

    getContract(
        web3React: Web3ReactContextInterface,
        type: ContractTypes,
        address: string,
        signerAccount?: string
    ): ethers.Contract {
        const { library } = web3React;

        if (signerAccount) {
            return new ethers.Contract(
                address,
                schema[type],
                this.getProviderOrSigner(library, signerAccount)
            );
        }

        return new ethers.Contract(address, schema[type], library);
    }

    getActiveWeb3React(): Web3ReactContextInterface {
        const contextBackup = this.contexts[web3ContextNames.backup];
        const contextInjected = this.contexts[web3ContextNames.injected];

        return contextInjected.active &&
            contextInjected.chainId === supportedChainId
            ? contextInjected
            : contextBackup;
    }

    getWeb3React(name): Web3ReactContextInterface {
        if (!this.contexts[name]) {
            throw new Error(ERRORS.ContextNotFound);
        }
        return this.contexts[name];
    }

    @action setWeb3Context(name, context: Web3ReactContextInterface) {
        console.log('[setWeb3Context]', name, context);
        this.contexts[name] = context;
    }

    @action sendTransaction = async (
        web3React: Web3ReactContextInterface,
        contractType: ContractTypes,
        contractAddress: string,
        action: string,
        params: any[],
        overrides?: any
    ): Promise<void> => {
        const { transactionStore } = this.rootStore;
        const { chainId, account } = web3React;

        overrides = overrides ? overrides : {};

        if (!account) {
            throw new Error(ERRORS.BlockchainActionNoAccount);
        }

        if (!chainId) {
            throw new Error(ERRORS.BlockchainActionNoChainId);
        }

        const contract = this.getContract(
            web3React,
            contractType,
            contractAddress,
            account
        );

        const { txResponse, error } = await sendAction({
            contract,
            action,
            sender: account,
            data: params,
            overrides,
        });

        if (error) {
            console.log('[Send Transaction Error', error);
        } else if (txResponse) {
            transactionStore.addTransactionRecord(account, txResponse);
        } else {
            throw new Error(ERRORS.BlockchainActionNoResponse);
        }
    };
}
