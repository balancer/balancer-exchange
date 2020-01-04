import { action, observable, ObservableMap } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { parseEther } from 'ethers/utils';
import * as deployed from 'deployed.json';
import { FetchCode } from './Transaction';
import { BigNumber } from 'ethers/utils';
import { chainNameById } from '../provider/connectors';

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    tokens: TokenMetadata[];
}

interface TokenBalanceMap {
    [index: string]: UserBalanceMap;
}

interface UserBalanceMap {
    [index: string]: BigNumber;
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    decimals: number;
}

interface UserAllowanceMap {
    [index: string]: {
        [index: string]: {
            [index: string]: BigNumber;
        };
    };
}

export default class TokenStore {
    @observable symbols = {};
    @observable balances: ObservableMap<number, TokenBalanceMap>;
    @observable allowances: ObservableMap<number, UserAllowanceMap>;
    @observable contractMetadata: ObservableMap<number, ContractMetadata>;
    rootStore: RootStore;

    constructor(rootStore, networkIds) {
        this.rootStore = rootStore;
        this.balances = new ObservableMap<number, TokenBalanceMap>();
        this.allowances = new ObservableMap<number, UserAllowanceMap>();
        this.contractMetadata = new ObservableMap<number, ContractMetadata>();

        networkIds.forEach(networkId => {
            this.balances.set(networkId, {});
            this.allowances.set(networkId, {});
            this.loadWhitelistedTokenMetadata(networkId);
        });
    }

    // Take the data from the JSON and get it into the store, so we access it just like other data

    // network -> contrants -> tokens -> tokens[a] = TokenMetadata
    @action loadWhitelistedTokenMetadata(chainId: number) {
        const chainName = chainNameById[chainId];
        console.log(chainName === 'kovan');
        console.log({ chainName, metadata: deployed['kovan'], deployed });
        const tokenMetadata = deployed['kovan'].tokens;
        console.log(tokenMetadata);

        const contractMetadata = {
            bFactory: deployed['kovan'].bFactory,
            proxy: deployed['kovan'].proxy,
            tokens: [] as TokenMetadata[],
        };

        tokenMetadata.forEach(token => {
            const { address, symbol, decimals } = token;
            contractMetadata.tokens.push({
                address,
                symbol,
                decimals,
            });
        });

        this.contractMetadata.set(chainId, contractMetadata);
    }

    getWhitelistedTokenMetadata(chainId): TokenMetadata[] {
        const contractMetadata = this.contractMetadata.get(chainId);

        if (!contractMetadata) {
            throw new Error(
                'Attempting to get whitelisted tokens for untracked chainId'
            );
        }

        return contractMetadata.tokens;
    }

    setAllowanceProperty(tokenAddress, owner, spender, amount): void {
        if (!this.allowances[tokenAddress]) {
            this.allowances[tokenAddress] = {};
        }

        if (!this.allowances[tokenAddress][owner]) {
            this.allowances[tokenAddress][owner] = {};
        }

        this.allowances[tokenAddress][owner][spender] = amount;
    }

    setBalanceProperty(
        chainId: number,
        tokenAddress: string,
        account: string,
        balance: BigNumber
    ): void {
        if (!this.balances[tokenAddress]) {
            this.balances[tokenAddress] = {};
        }

        if (!this.balances[tokenAddress][account]) {
            this.balances[tokenAddress][account] = {};
        }

        this.balances[tokenAddress][account] = balance;
    }

    getBalance(chainId, tokenAddress, account): BigNumber | undefined {
        //@ts-ignore
        const balance = this.balances[tokenAddress][account];
        if (!balance) {
            return undefined;
        }
        return balance;
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

    @action fetchBalancerTokenData = async (
        account,
        chainId
    ): Promise<FetchCode> => {
        const tokensToTrack = this.getWhitelistedTokenMetadata(chainId);

        const promises: Promise<any>[] = [];
        //TODO: Promise.all
        tokensToTrack.forEach((value, index) => {
            promises.push(this.fetchBalanceOf(chainId, value.address, account));
            promises.push(
                this.fetchAllowance(
                    chainId,
                    value.address,
                    account,
                    deployed[chainId].proxy
                )
            );
        });

        try {
            await Promise.all(promises);
        } catch (e) {
            console.error('[Fetch] Balancer Token Data', { error: e });
            return FetchCode.FAILURE;
        }
        return FetchCode.SUCCESS;
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

    @action fetchBalanceOf = async (chainId, tokenAddress, account) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );

        const balance = await token.balanceOf(account);
        this.setBalanceProperty(chainId, tokenAddress, account, balance);
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

    @action fetchAllowance = async (chain, tokenAddress, account, spender) => {
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

    getAllowance = (
        chainId,
        tokenAddress,
        account,
        spender
    ): BigNumber | undefined => {
        if (!this.allowances[tokenAddress]) {
            return undefined;
        }

        if (!this.allowances[tokenAddress][account]) {
            return undefined;
        }

        return this.allowances[tokenAddress][account][spender];
    };
}
