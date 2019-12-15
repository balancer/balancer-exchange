import { observable, action } from 'mobx';
import { injected, backup } from 'provider/connectors';
import RootStore from 'stores/Root';
import { web3ContextNames } from 'configs/network';
import { ethers, utils } from 'ethers';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';

export enum ContractTypes {
    BPool = 'BPool',
    BFactory = 'BFactory',
    TestToken = 'TestToken',
    ExchangeProxy = 'ExchangeProxy',
}

export const schema = {
    BPool: require('../abi/BPool'),
    BFactory: require('../abi/BFactory'),
    TestToken: require('../abi/TestToken'),
    ExchangeProxy: require('../abi/ExchangeProxy'),
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

    getWeb3React(): Web3ReactContextInterface {
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
        return contextInjected.active ? web3ContextNames.injected : web3ContextNames.backup;
    }

    getActiveLibrary() {
        const context = this.getWeb3React();
        return context.library;
    }


    getContract(type: ContractTypes, address: string, signerAccount?: string): ethers.Contract {
        const checksum = utils.getAddress(address);

        console.log(this.getActiveLibrary())

        if (signerAccount) {
            return new ethers.Contract(
              checksum,
              schema[type],
              this.getActiveLibrary().getSigner(signerAccount)
            );
        }

        return new ethers.Contract(
            checksum,
            schema[type],
            this.getActiveLibrary()
        );
    }

    @action setWeb3Context(name, context) {
        this.contexts[name] = context;
    }
}
