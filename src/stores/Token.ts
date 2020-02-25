import { action, observable, ObservableMap } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { bnum } from 'utils/helpers';
import { parseEther } from 'ethers/utils';
import * as deployed from 'deployed.json';
import { FetchCode } from './Transaction';
import { BigNumber } from 'utils/bignumber';
import {
    AsyncStatus,
    TokenBalanceFetch,
    UserAllowanceFetch,
} from './actions/fetch';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    weth: string;
    tokens: TokenMetadata[];
}

export interface ContractMetadataMap {
    [index: number]: ContractMetadata;
}

export interface TokenBalance {
    balance: BigNumber;
    lastFetched: number;
}

export interface UserAllowance {
    allowance: BigNumber;
    lastFetched: number;
}

interface TokenBalanceMap {
    [index: string]: {
        [index: string]: TokenBalance;
    };
}

export interface BigNumberMap {
    [index: string]: BigNumber;
}

export interface TokenMetadata {
    address: string;
    symbol: string;
    decimals: number;
    iconAddress: string;
    precision: number;
}

interface BlockNumberMap {
    [index: number]: {
        [index: string]: number;
    };
}

interface UserAllowanceMap {
    [index: string]: {
        [index: string]: {
            [index: string]: UserAllowance;
        };
    };
}

export const EtherKey = 'ether';

export default class TokenStore {
    @observable symbols = {};
    @observable balances: ObservableMap<number, TokenBalanceMap>;
    @observable allowances: ObservableMap<number, UserAllowanceMap>;
    @observable contractMetadata: ContractMetadataMap;
    @observable userBalancerDataLastFetched: BlockNumberMap;
    rootStore: RootStore;

    constructor(rootStore, networkIds) {
        this.rootStore = rootStore;
        this.balances = new ObservableMap<number, TokenBalanceMap>();
        this.allowances = new ObservableMap<number, UserAllowanceMap>();
        this.contractMetadata = {} as ContractMetadataMap;
        this.userBalancerDataLastFetched = {} as BlockNumberMap;

        networkIds.forEach(networkId => {
            this.balances.set(networkId, {});
            this.allowances.set(networkId, {});
            this.userBalancerDataLastFetched[networkId] = {};
            this.loadWhitelistedTokenMetadata(networkId);
        });
    }

    // Take the data from the JSON and get it into the store, so we access it just like other data

    // network -> contrants -> tokens -> tokens[a] = TokenMetadata
    @action loadWhitelistedTokenMetadata(chainId: number) {
        const tokenMetadata = deployed['kovan'].tokens;

        const contractMetadata = {
            bFactory: deployed['kovan'].bFactory,
            proxy: deployed['kovan'].proxy,
            weth: deployed['kovan'].weth,
            tokens: [] as TokenMetadata[],
        };

        tokenMetadata.forEach(token => {
            const { address, symbol, decimals, iconAddress, precision } = token;
            contractMetadata.tokens.push({
                address,
                symbol,
                decimals,
                iconAddress,
                precision,
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

    getWethAddress(chainId): string {
        const address = this.contractMetadata[chainId].weth;
        if (!address) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return address;
    }

    getTokenMetadata(chainId: number, address: string): TokenMetadata {
        const contractMetadata = this.contractMetadata[chainId];

        if (!contractMetadata) {
            throw new Error(
                'Attempting to get whitelisted tokens for untracked chainId'
            );
        }

        const tokenMetadata = contractMetadata.tokens.find(
            element => element.address === address
        );

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
            throw new Error(
                'Attempting to get user balances for untracked chainId'
            );
        }

        let filteredMetadata: TokenMetadata[] = [];

        if (filter.indexOf('0x') === 0) {
            //Search by address
            filteredMetadata = tokens.filter(value => {
                return value.address === filter;
            });
        } else {
            //Search by symbol
            filteredMetadata = tokens.filter(value => {
                const valueString = value.symbol.toLowerCase();
                filter = filter.toLowerCase();
                return valueString.includes(filter);
            });
        }

        return filteredMetadata;
    }

    getAccountBalances(
        chainId: number,
        tokens: TokenMetadata[],
        account: string
    ): BigNumberMap {
        const userBalances = this.balances.get(chainId);
        if (!userBalances) {
            throw new Error(
                'Attempting to get user balances for untracked chainId'
            );
        }

        const result: BigNumberMap = {};
        tokens.forEach(value => {
            if (
                userBalances[value.address] &&
                userBalances[value.address][account]
            ) {
                result[value.address] =
                    userBalances[value.address][account].balance;
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

    getUserBalancerDataLastFetched(chainId: number, account: string): number {
        try {
            return this.userBalancerDataLastFetched[chainId][account];
        } catch (e) {
            console.error(e);
            return -1;
        }
    }

    setUserBalancerDataLastFetched(
        chainId: number,
        account: string,
        blockNumber: number
    ) {
        if (!this.userBalancerDataLastFetched[chainId]) {
            throw new Error(
                'Attempt to set user balancer data for untracked chainId'
            );
        }
        if (!this.userBalancerDataLastFetched[chainId][account]) {
            this.userBalancerDataLastFetched[chainId][account] = blockNumber;
        }
    }

    private setAllowanceProperty(
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
            lastFetched: blockFetched,
        };

        this.allowances.set(chainId, chainApprovals);
    }

    private setBalanceProperty(
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
            lastFetched: blockFetched,
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

    private getBalanceLastFetched(
        chainId,
        tokenAddress,
        account
    ): number | undefined {
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

    @action approveMax = async (web3React, tokenAddress, spender) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
            web3React,
            ContractTypes.TestToken,
            tokenAddress,
            'approve',
            [spender, helpers.MAX_UINT.toString()]
        );
    };

    @action revokeApproval = async (web3React, tokenAddress, spender) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
            web3React,
            ContractTypes.TestToken,
            tokenAddress,
            'approve',
            [spender, 0]
        );
    };

    @action fetchBalancerTokenData = async (
        web3React,
        account,
        chainId
    ): Promise<FetchCode> => {
        const { providerStore } = this.rootStore;
        const tokensToTrack = this.getWhitelistedTokenMetadata(chainId);

        const promises: Promise<any>[] = [];
        const fetchBlock = providerStore.getCurrentBlockNumber(chainId);
        tokensToTrack.forEach((value, index) => {
            promises.push(
                this.fetchBalanceOf(
                    web3React,
                    chainId,
                    value.address,
                    account,
                    fetchBlock
                )
            );
            promises.push(
                this.fetchAllowance(
                    web3React,
                    chainId,
                    value.address,
                    account,
                    this.contractMetadata[chainId].proxy,
                    fetchBlock
                )
            );
        });

        let allFetchesSuccess = true;

        try {
            const responses = await Promise.all(promises);
            responses.forEach(response => {
                if (response instanceof TokenBalanceFetch) {
                    const { status, request, payload } = response;
                    if (status === AsyncStatus.SUCCESS) {
                        this.setBalanceProperty(
                            request.chainId,
                            request.tokenAddress,
                            request.account,
                            payload.balance,
                            payload.lastFetched
                        );
                    } else {
                        allFetchesSuccess = false;
                    }
                } else if (response instanceof UserAllowanceFetch) {
                    const { status, request, payload } = response;
                    if (status === AsyncStatus.SUCCESS) {
                        this.setAllowanceProperty(
                            request.chainId,
                            request.tokenAddress,
                            request.owner,
                            request.spender,
                            payload.allowance,
                            payload.lastFetched
                        );
                    } else {
                        allFetchesSuccess = false;
                    }
                }
            });

            if (allFetchesSuccess) {
                console.log('[All Fetches Success]');
                this.setUserBalancerDataLastFetched(
                    chainId,
                    account,
                    fetchBlock
                );
            }
        } catch (e) {
            console.error('[Fetch] Balancer Token Data', { error: e });
            return FetchCode.FAILURE;
        }
        return FetchCode.SUCCESS;
    };

    @action fetchSymbol = async (
        web3React: Web3ReactContextInterface,
        tokenAddress
    ) => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            web3React,
            ContractTypes.TestToken,
            tokenAddress
        );
        this.symbols[tokenAddress] = await token.symbol().call();
    };

    @action fetchBalanceOf = async (
        web3React: Web3ReactContextInterface,
        chainId: number,
        tokenAddress: string,
        account: string,
        fetchBlock: number
    ): Promise<TokenBalanceFetch> => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            web3React,
            ContractTypes.TestToken,
            tokenAddress
        );

        /* Before and after the network operation, check for staleness
            If the fetch is stale, don't do network call
            If the fetch is stale after network call, don't set DB variable
        */
        const stale =
            fetchBlock <=
            this.getBalanceLastFetched(chainId, tokenAddress, account);
        if (!stale) {
            let balance;

            if (tokenAddress === EtherKey) {
                const { library } = web3React;
                balance = bnum(await library.getBalance(account));
            } else {
                balance = bnum(await token.balanceOf(account));
            }

            const stale =
                fetchBlock <=
                this.getBalanceLastFetched(chainId, tokenAddress, account);
            if (!stale) {
                console.debug('[Balance Fetch]', {
                    tokenAddress,
                    account,
                    balance: balance.toString(),
                    fetchBlock,
                });
                return new TokenBalanceFetch({
                    status: AsyncStatus.SUCCESS,
                    request: {
                        chainId,
                        tokenAddress,
                        account,
                        fetchBlock,
                    },
                    payload: {
                        balance,
                        lastFetched: fetchBlock,
                    },
                });
            }
        } else {
            console.debug('[Balance Fetch] - Stale', {
                tokenAddress,
                account,
                fetchBlock,
            });
            return new TokenBalanceFetch({
                status: AsyncStatus.STALE,
                request: {
                    chainId,
                    tokenAddress,
                    account,
                    fetchBlock,
                },
                payload: undefined,
            });
        }
    };

    @action mint = async (
        web3React: Web3ReactContextInterface,
        tokenAddress: string,
        amount: string
    ) => {
        const { providerStore } = this.rootStore;
        await providerStore.sendTransaction(
            web3React,
            ContractTypes.TestToken,
            tokenAddress,
            'mint',
            [parseEther(amount).toString()]
        );
    };

    @action fetchAllowance = async (
        web3React: Web3ReactContextInterface,
        chainId: number,
        tokenAddress: string,
        owner: string,
        spender: string,
        fetchBlock: number
    ): Promise<UserAllowanceFetch> => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            web3React,
            ContractTypes.TestToken,
            tokenAddress
        );

        // Always max allowance for Ether
        if (tokenAddress === EtherKey) {
            return new UserAllowanceFetch({
                status: AsyncStatus.SUCCESS,
                request: {
                    chainId,
                    tokenAddress,
                    owner,
                    spender,
                    fetchBlock,
                },
                payload: {
                    allowance: bnum(helpers.setPropertyToMaxUintIfEmpty()),
                    lastFetched: fetchBlock,
                },
            });
        }

        /* Before and after the network operation, check for staleness
            If the fetch is stale, don't do network call
            If the fetch is stale after network call, don't set DB variable
        */
        const stale =
            fetchBlock <=
            this.getAllowanceLastFetched(chainId, tokenAddress, owner, spender);
        if (!stale) {
            const allowance = bnum(await token.allowance(owner, spender));
            const stale =
                fetchBlock <=
                this.getAllowanceLastFetched(
                    chainId,
                    tokenAddress,
                    owner,
                    spender
                );
            if (!stale) {
                console.debug('[Allowance Fetch]', {
                    tokenAddress,
                    owner,
                    spender,
                    allowance: allowance.toString(),
                    fetchBlock,
                });
                return new UserAllowanceFetch({
                    status: AsyncStatus.SUCCESS,
                    request: {
                        chainId,
                        tokenAddress,
                        owner,
                        spender,
                        fetchBlock,
                    },
                    payload: {
                        allowance,
                        lastFetched: fetchBlock,
                    },
                });
            }
        } else {
            console.debug('[Allowance Fetch] - Stale', {
                tokenAddress,
                owner,
                spender,
                fetchBlock,
            });
            return new UserAllowanceFetch({
                status: AsyncStatus.STALE,
                request: {
                    chainId,
                    tokenAddress,
                    owner,
                    spender,
                    fetchBlock,
                },
                payload: undefined,
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
