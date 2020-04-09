import { action, observable, ObservableMap } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { bnum } from 'utils/helpers';
import { FetchCode } from './Transaction';
import { BigNumber } from 'utils/bignumber';
import { Interface } from 'ethers/utils';
import {
    AsyncStatus,
    TokenBalanceFetch,
    UserAllowanceFetch,
} from './actions/fetch';
import { Web3ReactContextInterface } from '@web3-react/core/dist/types';
import { getSupportedChainId } from '../provider/connectors';
import { scale } from 'utils/helpers';

const tokenAbi = require('../abi/TestToken').abi;
const deployed = require('deployed.json');

export interface ContractMetadata {
    bFactory: string;
    proxy: string;
    weth: string;
    multicall: string;
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
        const network = Object.keys(deployed).find(
            item => deployed[item].chainId === chainId
        );

        const tokenMetadata = deployed[network].tokens;

        const contractMetadata = {
            bFactory: deployed[network].bFactory,
            proxy: deployed[network].proxy,
            weth: deployed[network].weth,
            multicall: deployed[network].multicall,
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

    normalizeBalance(weiBalance: BigNumber, tokenAddress: string): string {
        const chainId = getSupportedChainId();
        const decimals = this.contractMetadata[chainId].tokens.find(
            token => token.address === tokenAddress
        ).decimals;
        return scale(weiBalance, -decimals).toString();
    }

    getMultiAddress(chainId): string {
        const multiAddress = this.contractMetadata[chainId].multicall;
        if (!multiAddress) {
            throw new Error(
                '[Invariant] Trying to get non-loaded static address'
            );
        }
        return multiAddress;
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

    isAllowanceFetched(
        chainId,
        tokenAddress: string,
        owner: string,
        spender: string
    ) {
        const chainApprovals = this.allowances.get(chainId);
        return (
            !!chainApprovals[tokenAddress] &&
            !!chainApprovals[tokenAddress][owner][spender]
        );
    }

    isAllowanceStale(
        chainId,
        tokenAddress: string,
        owner: string,
        spender: string,
        blockNumber: number
    ) {
        const chainApprovals = this.allowances.get(chainId);
        return (
            chainApprovals[tokenAddress][owner][spender].lastFetched <
            blockNumber
        );
    }

    private setAllowances(
        chainId,
        tokens: string[],
        owner: string,
        spender: string,
        approvals: BigNumber[],
        fetchBlock: number
    ) {
        const chainApprovals = this.allowances.get(chainId);

        approvals.forEach((approval, index) => {
            const tokenAddress = tokens[index];

            if (
                (this.isAllowanceFetched(
                    chainId,
                    tokenAddress,
                    owner,
                    spender
                ) &&
                    this.isAllowanceStale(
                        chainId,
                        tokenAddress,
                        owner,
                        spender,
                        fetchBlock
                    )) ||
                !this.isAllowanceFetched(chainId, tokenAddress, owner, spender)
            ) {
                if (!chainApprovals[tokenAddress]) {
                    chainApprovals[tokenAddress] = {};
                }

                if (!chainApprovals[tokenAddress][owner]) {
                    chainApprovals[tokenAddress][owner] = {};
                }

                chainApprovals[tokenAddress][owner][spender] = {
                    allowance: approval,
                    lastFetched: fetchBlock,
                };
            }
        });

        this.allowances.set(chainId, {
            ...this.allowances.get(chainId),
            ...chainApprovals,
        });
    }

    isBalanceFetched(chainId, tokenAddress: string, account: string) {
        const chainBalances = this.balances.get(chainId);
        return (
            !!chainBalances[tokenAddress] &&
            !!chainBalances[tokenAddress][account]
        );
    }

    isBalanceStale(
        chainId,
        tokenAddress: string,
        account: string,
        blockNumber: number
    ) {
        const chainBalances = this.balances.get(chainId);
        return chainBalances[tokenAddress][account].lastFetched < blockNumber;
    }

    private setBalances(
        chainId,
        tokens: string[],
        balances: BigNumber[],
        account: string,
        fetchBlock: number
    ) {
        const fetchedBalances: TokenBalanceMap = {};

        balances.forEach((balance, index) => {
            const tokenAddress = tokens[index];

            if (
                (this.isBalanceFetched(chainId, tokenAddress, account) &&
                    this.isBalanceStale(
                        chainId,
                        tokenAddress,
                        account,
                        fetchBlock
                    )) ||
                !this.isBalanceFetched(chainId, tokenAddress, account)
            ) {
                if (this.balances[tokenAddress]) {
                    fetchedBalances[tokenAddress] = this.balances[tokenAddress];
                } else {
                    fetchedBalances[tokenAddress] = {};
                }

                fetchedBalances[tokenAddress][account] = {
                    balance: balance,
                    lastFetched: fetchBlock,
                };
            }
        });

        this.balances.set(chainId, {
            ...this.balances.get(chainId),
            ...fetchedBalances,
        });
    }

    getBalance(
        chainId: number,
        tokenAddress: string,
        account: string
    ): BigNumber | undefined {
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
        const balanceCalls = [];
        const allowanceCalls = [];
        const tokenList = [];

        const multiAddress = this.getMultiAddress(chainId);

        const multi = providerStore.getContract(
            web3React,
            ContractTypes.Multicall,
            multiAddress
        );

        const iface = new Interface(tokenAbi);

        tokensToTrack.forEach(value => {
            tokenList.push(value.address);
            if (value.address !== EtherKey) {
                balanceCalls.push([
                    value.address,
                    iface.functions.balanceOf.encode([account]),
                ]);
                allowanceCalls.push([
                    value.address,
                    iface.functions.allowance.encode([
                        account,
                        this.contractMetadata[chainId].proxy,
                    ]),
                ]);
            }
        });

        promises.push(multi.aggregate(balanceCalls));
        promises.push(multi.aggregate(allowanceCalls));
        promises.push(multi.getEthBalance(account));

        try {
            const [
                [balBlock, mulBalance],
                [allBlock, mulAllowance],
                mulEth,
            ] = await Promise.all(promises);
            const balances = mulBalance.map(value =>
                bnum(iface.functions.balanceOf.decode(value))
            );

            const allowances = mulAllowance.map(value =>
                bnum(iface.functions.allowance.decode(value))
            );

            const ethBalance = bnum(mulEth);
            balances.unshift(ethBalance);
            allowances.unshift(bnum(helpers.setPropertyToMaxUintIfEmpty()));

            this.setBalances(
                chainId,
                tokenList,
                balances,
                account,
                balBlock.toNumber()
            );

            this.setAllowances(
                chainId,
                tokenList,
                account,
                this.contractMetadata[chainId].proxy,
                allowances,
                allBlock.toNumber()
            );

            console.debug('[All Fetches Success]');
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
                const token = providerStore.getContract(
                    web3React,
                    ContractTypes.TestToken,
                    tokenAddress
                );
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

    @action fetchAllowance = async (
        web3React: Web3ReactContextInterface,
        chainId: number,
        tokenAddress: string,
        owner: string,
        spender: string,
        fetchBlock: number
    ): Promise<UserAllowanceFetch> => {
        const { providerStore } = this.rootStore;

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
