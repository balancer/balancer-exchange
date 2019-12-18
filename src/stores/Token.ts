import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ethers, utils } from 'ethers';
import * as helpers from 'utils/helpers';
import { ContractTypes } from 'stores/Provider';

export default class PoolStore {
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
        const account = await providerStore.getActiveAccount();
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress,
            account
        );

        try {
            await token.approve(spender, helpers.MAX_UINT);
            await this.fetchAllowance(tokenAddress, account, spender);
        } catch (e) {
            console.log(e);
        }
    };

    @action revokeApproval = async (tokenAddress, spender) => {
        const { providerStore } = this.rootStore;
        const account = await providerStore.getActiveAccount();
        const token = providerStore.getContract(
          ContractTypes.TestToken,
          tokenAddress,
          account
        );

        try {
            await token.approve(spender, 0);
            await this.fetchAllowance(tokenAddress, account, spender);
        } catch (e) {
            console.log(e);
        }
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

        const balance = await token.balanceOf(account).call();
        this.setBalanceProperty(tokenAddress, account, balance);
    };

    @action mint = async (tokenAddress: string, amount: string) => {
        const { providerStore } = this.rootStore;
        const account = await providerStore.getActiveAccount();
        const token = providerStore.getContract(
          ContractTypes.TestToken,
          tokenAddress,
          account
        );

        await token.mint(utils.bigNumberify(amount));
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
