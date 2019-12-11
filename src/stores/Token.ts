import { observable, action } from "mobx";
import { RootStore } from "stores/Root";
import * as helpers from "utils/helpers";
import * as blockchain from "utils/blockchain";

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
    const token = blockchain.loadObject("TestToken", tokenAddress, "TestToken");
    const account = await blockchain.getDefaultAccount();

    try {
      await token.methods.approve(spender, helpers.MAX_UINT).send();
      await this.fetchAllowance(tokenAddress, account, spender);
    } catch (e) {
      console.log(e);
    }
  };

  @action revokeApproval = async (tokenAddress, spender) => {
    const token = blockchain.loadObject("TestToken", tokenAddress, "TestToken");
    const account = await blockchain.getDefaultAccount();

    try {
      await token.methods.approve(spender, 0).send();
      await this.fetchAllowance(tokenAddress, account, spender);
    } catch (e) {
      console.log(e);
    }
  };

  @action fetchSymbol = async tokenAddress => {
    const token = blockchain.loadObject("TestToken", tokenAddress, "TestToken");
    const symbol = await token.methods.symbol().call();
    this.symbols[tokenAddress] = symbol;
  };

  @action fetchBalanceOf = async (tokenAddress, account) => {
    const token = blockchain.loadObject("TestToken", tokenAddress, "TestToken");
    const balance = await token.methods.balanceOf(account).call();
    this.setBalanceProperty(tokenAddress, account, balance);
  };

  @action fetchAllowance = async (tokenAddress, account, spender) => {
    const token = blockchain.loadObject("TestToken", tokenAddress, "TestToken");
    const allowance = await token.methods.allowance(account, spender).call();
    this.setAllowanceProperty(tokenAddress, account, spender, allowance);
    console.log(
      "Allowance Property Set",
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
