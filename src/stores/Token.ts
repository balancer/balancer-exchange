import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers'
import { formatEther, parseEther } from "ethers/utils";

export default class TokenStore {
    @observable symbols = {};
    @observable balances = {};
    @observable allowances = {};
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
    }

    setAllowanceProperty(tokenAddress, owner, spender, amount) {
        if (!this.allowances[tokenAddress]) {
            this.allowances[tokenAddress] = {};
        }

        if (!this.allowances[tokenAddress][owner]) {
            this.allowances[tokenAddress][owner] = {};
        }

        this.allowances[tokenAddress][owner][spender] = amount;
    }

    setBalanceProperty(tokenAddress, account, balance) {
        if (!this.balances[tokenAddress]) {
            this.balances[tokenAddress] = {};
        }

        this.balances[tokenAddress][account] = balance;
    }

    hasBalance(tokenAddress, account) {
        if (!this.balances[tokenAddress]) {
            return false;
        }

        if (!this.balances[tokenAddress][account]) {
            return false;
        }

        return true;
    }

    getBalance(tokenAddress, account) {
        return this.balances[tokenAddress][account];
    }

    @action approveMax = async (tokenAddress, spender) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
          ContractTypes.TestToken,
          tokenAddress,
          'approve',
          [spender, helpers.MAX_UINT.toString()]
        );
    };

    @action revokeApproval = async (tokenAddress, spender) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
          ContractTypes.TestToken,
          tokenAddress,
          'approve',
          [spender, 0]
        );
    };

    @action fetchSymbol = async tokenAddress => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );
        this.symbols[tokenAddress] = await token.symbol().call();
    };

    @action fetchEtherBalance = async (tokenAddress, account) => {};

    @action fetchBalanceOf = async (tokenAddress, account) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );

        const balance = await token.balanceOf(account);
        this.setBalanceProperty(tokenAddress, account, balance);
    };

    @action mint = async (tokenAddress: string, amount: string) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
            ContractTypes.TestToken,
            tokenAddress,
            'mint',
            [parseEther(amount).toString()]
        );
    };

    @action fetchAllowance = async (tokenAddress, account, spender) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );

        const allowance = await token.allowance(account, spender);

        this.setAllowanceProperty(tokenAddress, account, spender, allowance);

        console.log(
            'Allowance Property Set',
            tokenAddress,
            account,
            spender,
            allowance
        );
    };

    getAllowance = (tokenAddress, account, spender) => {
        if (!this.allowances[tokenAddress]) {
            return undefined;
        }

        if (!this.allowances[tokenAddress][account]) {
            return undefined;
        }

        return this.allowances[tokenAddress][account][spender];
    };
}
