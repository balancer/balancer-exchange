import { observable, action, ObservableMap } from "mobx";
import RootStore from 'stores/Root';
import { web3ContextNames } from 'provider/connectors';
import { ethers, utils, providers } from 'ethers';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import UncheckedJsonRpcSigner from 'provider/UncheckedJsonRpcSigner';
import Web3 from 'web3';
import { sendAction } from './actions/actions';
import { TransactionRecord } from "./Transaction";

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
    currentBlockNumber: number
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
    rootStore: RootStore;

    constructor(rootStore, networkIds: number[]) {
        this.rootStore = rootStore;
        this.contexts = {};
        this.supportedNetworks = networkIds;
        this.chainData = new ObservableMap<number, ChainData>();

        networkIds.forEach(networkId => {
            this.chainData.set(networkId, {
                currentBlockNumber: -1
            });
        });
    }

    private safeGetChainData(chainId): ChainData {
        const chainData = this.chainData.get(chainId);
        if (!chainData) {
            throw new Error('Attempting to access chain data for non-existent chainId')
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


    @action fetchUserBlockchainData = async (networkId: number) => {
        const {transactionStore, tokenStore} = this.rootStore;
        const {chainId, account} = this.getActiveWeb3React();

        console.log('[Fetch Start - User Blockchain Data]', {
            chainId, account
        });

        if (networkId !== chainId) {
            throw new Error('Attempting to fetch data for inactive chainId');
        }

        if (account) {
            await transactionStore.checkPendingTransactions(networkId);
            await tokenStore.fetchBalancerTokenData(account, networkId);
        }

        console.log('[Fetch End - User Blockchain Data]', {
            chainId, account
        });
    }

    getWeb3React(name: string): Web3ReactContextInterface {
        if (!this.contexts[name]) {
            throw new Error('Context not loaded to store');
        }

        return this.contexts[name];
    }

    getActiveWeb3React(): Web3ReactContextInterface {
        if (
            !this.contexts[web3ContextNames.injected] ||
            !this.contexts[web3ContextNames.backup]
        ) {
            throw new Error('Contexts not loaded to store');
        }

        const contextInjected = this.contexts[web3ContextNames.injected];
        const contextNetwork = this.contexts[web3ContextNames.backup];

        return contextInjected.active ? contextInjected : contextNetwork;
    }

    getActiveAccount(): string {
        if (this.getActiveProviderName() === web3ContextNames.backup) {
            throw new Error('No wallet to provide active account');
        }

        const { account } = this.getActiveWeb3React();

        if (!account) {
            throw new Error('No account available on active web3');
        }
        return account;
    }

    getActiveProviderName(): string {
        if (
            !this.contexts[web3ContextNames.injected] ||
            !this.contexts[web3ContextNames.backup]
        ) {
            throw new Error('Contexts not loaded to store');
        }

        const contextInjected = this.contexts[web3ContextNames.injected];
        const contextNetwork = this.contexts[web3ContextNames.backup];
        return contextInjected.active
            ? web3ContextNames.injected
            : web3ContextNames.backup;
    }

    // account is optional
    getProviderOrSigner(library, account) {
        console.log('[getProviderOrSigner', {
            library,
            account,
            signer: library.getSigner(account),
        });

        return account
            ? new UncheckedJsonRpcSigner(library.getSigner(account))
            : library;
    }

    getContract(
        type: ContractTypes,
        address: string,
        signerAccount?: string
    ): ethers.Contract {
        const { library } = this.getActiveWeb3React();

        if (signerAccount) {
            return new ethers.Contract(
                address,
                schema[type],
                this.getProviderOrSigner(library, signerAccount)
            );
        }

        return new ethers.Contract(address, schema[type], library);
    }

    @action setWeb3Context(name, context) {
        console.log('[setWeb3Context]', name, context);
        this.contexts[name] = context;
    }

    @action sendTransaction = async (
        contractType: ContractTypes,
        contractAddress: string,
        action: string,
        params: any[]
    ): Promise<void> => {
        const { transactionStore } = this.rootStore;
        const { chainId, account } = this.getActiveWeb3React();

        if (!account) {
            throw new Error(
                '[Error] Attempting to do blockchain transaction with no account'
            );
        }

        if (!chainId) {
            throw new Error(
                '[Invariant] Attempting to do blockchain transaction with no chainId'
            );
        }

        const contract = this.getContract(
            contractType,
            contractAddress,
            account
        );

        const { txResponse, error } = await sendAction({
            contract,
            action,
            sender: account,
            data: params,
        });

        if (error) {
            // Handle tx error
        } else if (txResponse) {
            transactionStore.addTransactionRecord(chainId, txResponse);
        } else {
            throw new Error(
                '[Invariant]: No error or response received from blockchain action'
            );
        }
    };
}
