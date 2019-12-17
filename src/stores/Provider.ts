import { observable, action } from 'mobx';
import RootStore from 'stores/Root';
import { web3ContextNames } from 'provider/connectors';
import { ethers, utils, providers } from 'ethers';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';

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

export default class ProviderStore {
    @observable provider: any;
    @observable accounts: string[];
    @observable defaultAccount: string | null;
    @observable contexts: object;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.contexts = {};
    }

    async getCurrentBlockNumber(): Promise<number> {
        const lib = this.getActiveLibrary();
        return lib.getBlockNumber();
    }

    getWeb3React(name: string): Web3ReactContextInterface {
        if (
          !this.contexts[name]
        ) {
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

        console.log(this.getActiveLibrary());
        return '0';
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

    getLibrary(provider: any): providers.Web3Provider {
        return new providers.Web3Provider(provider);
    }

    getActiveLibrary(): providers.Web3Provider {
        const context = this.getActiveWeb3React();
        return this.getLibrary(context.library);
    }

    getContract(
        type: ContractTypes,
        address: string,
        signerAccount?: string
    ): ethers.Contract {
        console.log(this.getActiveWeb3React());

        const lib = this.getActiveLibrary();
        console.log(lib);

        const randomWallet = ethers.Wallet.createRandom();
        const wallet = new ethers.Wallet(randomWallet.privateKey);
        let provider = ethers.getDefaultProvider('kovan');

        if (signerAccount) {
            return new ethers.Contract(
                address,
                schema[type],
                provider
                // lib.getSigner(signerAccount)
            );
        }

        return new ethers.Contract(address, schema[type], provider);
    }

    @action setWeb3Context(name, context) {
        this.contexts[name] = context;
    }
}
