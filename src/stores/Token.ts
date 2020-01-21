import { action, observable, ObservableMap } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { parseEther } from 'ethers/utils';
import * as deployed from 'deployed.json';
import { FetchCode } from './Transaction';
import { BigNumber } from 'utils/bignumber';
import { chainNameById } from '../provider/connectors';
import { bnum } from "utils/helpers";

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    tokens: TokenMetadata[];
}

export interface ContractMetadataMap {
    [index: number]: ContractMetadata;
}

interface TokenBalanceMap {
    [index: string]: {
        [index: string]: {
            balance: BigNumber,
            lastFetched: number
        };
    };
}

export interface BigNumberMap {
    [index: string]: BigNumber
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    decimals: number;
    iconAddress: string;
}

interface UserAllowanceMap {
    [index: string]: {
        [index: string]: {
            [index: string]: {
                allowance: BigNumber,
                lastFetched: number
            };
        };
    };
}

export default class TokenStore {
    @observable symbols = {};
    @observable balances: ObservableMap<number, TokenBalanceMap>;
    @observable allowances: ObservableMap<number, UserAllowanceMap>;
    @observable contractMetadata: ContractMetadataMap;
    rootStore: RootStore;

    constructor(rootStore, networkIds) {
        this.rootStore = rootStore;
        this.balances = new ObservableMap<number, TokenBalanceMap>();
        this.allowances = new ObservableMap<number, UserAllowanceMap>();
        this.contractMetadata = {};

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
            const { address, symbol, decimals, iconAddress } = token;
            contractMetadata.tokens.push({
                address,
                symbol,
                decimals,
                iconAddress,
            });
        });

        this.contractMetadata[chainId] = contractMetadata;
    }

    getProxyAddress(chainId): string {
        const proxyAddress = this.contractMetadata[chainId].proxy;
        if (!proxyAddress) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return proxyAddress;
    }

    getTokenMetadata(chainId: number, address: string): TokenMetadata {
        const contractMetadata = this.contractMetadata[chainId];

        if (!contractMetadata) {
            throw new Error(
              'Attempting to get whitelisted tokens for untracked chainId'
            );
        }

        const tokenMetadata = contractMetadata.tokens.find(element => element.address === address);

        if (!tokenMetadata) {
            throw new Error(
              'Attempting to get metadata for untracked token address'
            );
        }

        return tokenMetadata;
    }

    getFilteredTokenMetadata(chainId: number, filter: string): TokenMetadata[] {
        const tokens = this.contractMetadata[chainId].tokens || undefined;

        if (!tokens) {
            throw new Error('Attempting to get user balances for untracked chainId')
        }

        let filteredMetadata: TokenMetadata[] = [];

        if (filter.indexOf('0x') === 0) {
            //Search by address
            filteredMetadata = tokens.filter(value => {
                return value.address === filter;
            })

        } else {
            //Search by symbol
            filteredMetadata = tokens.filter(value => {
                const valueString = value.symbol.toLowerCase();
                filter = filter.toLowerCase();
                return valueString.includes(filter);
            })
        }

        return filteredMetadata;
    };

    getAccountBalances(chainId: number, tokens: TokenMetadata[], account: string): BigNumberMap {
        const userBalances = this.balances.get(chainId);
        if (!userBalances) {
            throw new Error ('Attempting to get user balances for untracked chainId')
        }

        const result: BigNumberMap = {};
        tokens.forEach(value => {
            if(userBalances[value.address] && userBalances[value.address][account]) {
                result[value.address] = userBalances[value.address][account].balance;
            }
        });

        return result;
    }

    getWhitelistedTokenMetadata(chainId): TokenMetadata[] {
        const contractMetadata = this.contractMetadata[chainId];

        if (!contractMetadata) {
            throw new Error(
                'Attempting to get whitelisted tokens for untracked chainId'
            );
        }

        return contractMetadata.tokens;
    }

    setAllowanceProperty(
        chainId: number,
        tokenAddress: string,
        owner: string,
        spender: string,
        approval: BigNumber,
        blockFetched: number
    ): void {
        const chainApprovals = this.allowances.get(chainId);
        if (!chainApprovals) {
            throw new Error(
                'Attempt to set balance property for untracked chainId'
            );
        }

        if (!chainApprovals[tokenAddress]) {
            chainApprovals[tokenAddress] = {};
        }

        if (!chainApprovals[tokenAddress][owner]) {
            chainApprovals[tokenAddress][owner] = {};
        }

        chainApprovals[tokenAddress][owner][spender] = {
            allowance: approval,
            lastFetched: blockFetched
        };

        this.allowances.set(chainId, chainApprovals);
    }

    setBalanceProperty(
        chainId: number,
        tokenAddress: string,
        account: string,
        balance: BigNumber,
        blockFetched: number
    ): void {
        const chainBalances = this.balances.get(chainId);
        if (!chainBalances) {
            throw new Error(
                'Attempt to set balance property for untracked chainId'
            );
        }

        if (!chainBalances[tokenAddress]) {
            chainBalances[tokenAddress] = {};
        }

        chainBalances[tokenAddress][account] = {
            balance: balance,
            lastFetched: blockFetched
        };

        this.balances.set(chainId, chainBalances);
    }

    getBalance(chainId, tokenAddress, account): BigNumber | undefined {
        const chainBalances = this.balances.get(chainId);
        if (chainBalances) {
            const tokenBalances = chainBalances[tokenAddress];
            if (tokenBalances) {
                const balance = tokenBalances[account];
                if (balance) {
                    if (balance.balance) {
                        return balance.balance;
                    }
                }
            }
        }
        return undefined;
    }

    private getBalanceLastFetched(chainId, tokenAddress, account): number | undefined {
        const chainBalances = this.balances.get(chainId);
        if (chainBalances) {
            const tokenBalances = chainBalances[tokenAddress];
            if (tokenBalances) {
                const balance = tokenBalances[account];
                if (balance) {
                    if (balance.lastFetched) {
                        return balance.lastFetched;
                    }
                }
            }
        }
        return undefined;
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
        const {providerStore} = this.rootStore;
        const tokensToTrack = this.getWhitelistedTokenMetadata(chainId);

        const promises: Promise<any>[] = [];
        const currentBlock = providerStore.getCurrentBlockNumber(chainId);
        //TODO: Promise.all
        tokensToTrack.forEach((value, index) => {
            promises.push(this.fetchBalanceOf(chainId, value.address, account, currentBlock));
            promises.push(
                this.fetchAllowance(
                    chainId,
                    value.address,
                    account,
                    this.contractMetadata[chainId].proxy,
                    currentBlock
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

    @action fetchBalanceOf = async (chainId: number, tokenAddress: string, account: string, fetchBlock: number) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );

        /* Before and after the network operation, check for staleness
            If the fetch is stale, don't do network call
            If the fetch is stale after network call, don't set DB variable
        */
        const stale = fetchBlock <= this.getBalanceLastFetched(chainId, tokenAddress, account);
        if (!stale) {
            const balance = bnum(await token.balanceOf(account));
            const stale = fetchBlock <= this.getBalanceLastFetched(chainId, tokenAddress, account);
            if (!stale) {
                this.setBalanceProperty(chainId, tokenAddress, account, balance, fetchBlock);
                console.log('[Balance Fetch]', {
                    tokenAddress,
                    account,
                    balance: balance.toString(),
                    fetchBlock
                });
            }
        } else {
            console.log('[Balance Fetch] - Stale', {
                tokenAddress,
                account,
                fetchBlock
            });
        }


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

    @action fetchAllowance = async (
        chainId,
        tokenAddress,
        account,
        spender,
        fetchBlock
    ) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );

        /* Before and after the network operation, check for staleness
            If the fetch is stale, don't do network call
            If the fetch is stale after network call, don't set DB variable
        */
        const stale = fetchBlock <= this.getBalanceLastFetched(chainId, tokenAddress, account);
        if (!stale) {
            const allowance = bnum(await token.allowance(account, spender));
            const stale = fetchBlock <= this.getBalanceLastFetched(chainId, tokenAddress, account);
            if (!stale) {
                this.setAllowanceProperty(
                  chainId,
                  tokenAddress,
                  account,
                  spender,
                  allowance,
                  fetchBlock
                );
                console.log('[Allowance Fetch]', {
                    tokenAddress,
                    account,
                    spender,
                    allowance: allowance.toString(),
                    fetchBlock
                });
            }

        } else {
            console.log('[Allowance Fetch] - Stale', {
                tokenAddress,
                account,
                spender,
                fetchBlock
            });
        }
    };

    getAllowance = (
        chainId,
        tokenAddress,
        account,
        spender
    ): BigNumber | undefined => {
        const chainApprovals = this.allowances.get(chainId);
        if (chainApprovals) {
            const tokenApprovals = chainApprovals[tokenAddress];
            if (tokenApprovals) {
                const userApprovals = tokenApprovals[account];
                if (userApprovals) {
                    if (userApprovals[spender]) {
                        return userApprovals[spender].allowance;
                    }
                }
            }
        }
        return undefined;
    };

    getAllowanceLastFetched = (
      chainId,
      tokenAddress,
      account,
      spender
    ): number | undefined => {
        const chainApprovals = this.allowances.get(chainId);
        if (chainApprovals) {
            const tokenApprovals = chainApprovals[tokenAddress];
            if (tokenApprovals) {
                const userApprovals = tokenApprovals[account];
                if (userApprovals) {
                    if (userApprovals[spender]) {
                        return userApprovals[spender].lastFetched;
                    }
                }
            }
        }
        return undefined;
    };
}
