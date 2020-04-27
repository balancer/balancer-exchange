import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { bnum, formatBalanceTruncated } from 'utils/helpers';
import { FetchCode } from './Transaction';
import { BigNumber } from 'utils/bignumber';
import { isAddress } from 'utils/helpers';
import { Interface } from 'ethers/utils';
import {
    AsyncStatus,
    TokenBalanceFetch,
    UserAllowanceFetch,
} from './actions/fetch';
import { getSupportedChainName } from '../provider/connectors';
import * as ethers from 'ethers';

const tokenAbi = require('../abi/TestToken').abi;

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
    balanceFormatted?: string;
    balanceBn?: BigNumber;
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
    @observable balances: TokenBalanceMap;
    @observable allowances: UserAllowanceMap;
    @observable contractMetadata: ContractMetadataMap;
    @observable userBalancerDataLastFetched: BlockNumberMap;
    @observable inputToken: TokenMetadata;
    @observable outputToken: TokenMetadata;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.balances = {} as TokenBalanceMap;
        this.allowances = {} as UserAllowanceMap;
        this.contractMetadata = {} as ContractMetadataMap;
        this.userBalancerDataLastFetched = {} as BlockNumberMap;
        this.inputToken = {
            address: 'unknown',
            symbol: 'unknown',
            decimals: 18,
            iconAddress: 'unknown',
            precision: 4, //!!!!!! What should this be if no config??
        };

        this.outputToken = {
            address: 'unknown',
            symbol: 'unknown',
            decimals: 18,
            iconAddress: 'unknown',
            precision: 4, //!!!!!! What should this be if no config??
        };
    }

    getAccountBalances(tokens: TokenMetadata[], account: string): BigNumberMap {
        const userBalances = this.balances;
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

    getUserBalancerDataLastFetched(account: string): number {
        try {
            return this.userBalancerDataLastFetched[account];
        } catch (e) {
            console.error(e);
            return -1;
        }
    }

    setUserBalancerDataLastFetched(account: string, blockNumber: number) {
        if (!this.userBalancerDataLastFetched) {
            throw new Error(
                'Attempt to set user balancer data for untracked chainId'
            );
        }
        if (!this.userBalancerDataLastFetched[account]) {
            this.userBalancerDataLastFetched[account] = blockNumber;
        }
    }

    private setAllowanceProperty(
        tokenAddress: string,
        owner: string,
        spender: string,
        approval: BigNumber,
        blockFetched: number
    ): void {
        const chainApprovals = this.allowances;
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

        this.allowances = chainApprovals;
    }

    isAllowanceFetched(tokenAddress: string, owner: string, spender: string) {
        const chainApprovals = this.allowances;
        return (
            !!chainApprovals[tokenAddress] &&
            !!chainApprovals[tokenAddress][owner] &&
            !!chainApprovals[tokenAddress][owner][spender]
        );
    }

    isAllowanceStale(
        tokenAddress: string,
        owner: string,
        spender: string,
        blockNumber: number
    ) {
        const chainApprovals = this.allowances;
        return (
            chainApprovals[tokenAddress][owner][spender].lastFetched <
            blockNumber
        );
    }

    private setAllowances(
        tokens: string[],
        owner: string,
        spender: string,
        approvals: BigNumber[],
        fetchBlock: number
    ) {
        const chainApprovals = this.allowances;

        approvals.forEach((approval, index) => {
            const tokenAddress = tokens[index];

            if (
                (this.isAllowanceFetched(tokenAddress, owner, spender) &&
                    this.isAllowanceStale(
                        tokenAddress,
                        owner,
                        spender,
                        fetchBlock
                    )) ||
                !this.isAllowanceFetched(tokenAddress, owner, spender)
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

        this.allowances = {
            ...this.allowances,
            ...chainApprovals,
        };
    }

    isBalanceFetched(tokenAddress: string, account: string) {
        const chainBalances = this.balances;
        return (
            !!chainBalances[tokenAddress] &&
            !!chainBalances[tokenAddress][account]
        );
    }

    isBalanceStale(tokenAddress: string, account: string, blockNumber: number) {
        const chainBalances = this.balances;
        return chainBalances[tokenAddress][account].lastFetched < blockNumber;
    }

    private setBalances(
        tokens: string[],
        balances: BigNumber[],
        account: string,
        fetchBlock: number
    ) {
        const fetchedBalances: TokenBalanceMap = {};

        balances.forEach((balance, index) => {
            const tokenAddress = tokens[index];

            if (
                (this.isBalanceFetched(tokenAddress, account) &&
                    this.isBalanceStale(tokenAddress, account, fetchBlock)) ||
                !this.isBalanceFetched(tokenAddress, account)
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

        this.balances = {
            ...this.balances,
            ...fetchedBalances,
        };
    }

    getBalance(tokenAddress: string, account: string): BigNumber | undefined {
        const chainBalances = this.balances;
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

    private getBalanceLastFetched(tokenAddress, account): number | undefined {
        const chainBalances = this.balances;
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
        tokensToTrack: string[]
    ): Promise<FetchCode> => {
        const { providerStore, contractMetadataStore } = this.rootStore;
        const promises: Promise<any>[] = [];
        const balanceCalls = [];
        const allowanceCalls = [];
        const tokenList = [];

        const multiAddress = contractMetadataStore.getMultiAddress();
        const multi = providerStore.getContract(
            ContractTypes.Multicall,
            multiAddress
        );

        const iface = new Interface(tokenAbi);

        tokensToTrack.forEach(address => {
            tokenList.push(address);
            if (address !== EtherKey) {
                balanceCalls.push([
                    address,
                    iface.functions.balanceOf.encode([account]),
                ]);
                allowanceCalls.push([
                    address,
                    iface.functions.allowance.encode([
                        account,
                        contractMetadataStore.getProxyAddress(),
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

            this.setBalances(tokenList, balances, account, balBlock.toNumber());

            this.setAllowances(
                tokenList,
                account,
                contractMetadataStore.getProxyAddress(),
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

    @action fetchSymbol = async tokenAddress => {
        const { providerStore } = this.rootStore;
        const token = providerStore.getContract(
            ContractTypes.TestToken,
            tokenAddress
        );
        this.symbols[tokenAddress] = await token.symbol().call();
    };

    @action fetchBalanceOf = async (
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
            fetchBlock <= this.getBalanceLastFetched(tokenAddress, account);
        if (!stale) {
            let balance;

            if (tokenAddress === EtherKey) {
                const { library } = providerStore.providerStatus.library;
                balance = bnum(await library.getBalance(account));
            } else {
                const token = providerStore.getContract(
                    ContractTypes.TestToken,
                    tokenAddress
                );
                balance = bnum(await token.balanceOf(account));
            }

            const stale =
                fetchBlock <= this.getBalanceLastFetched(tokenAddress, account);
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
                    tokenAddress,
                    account,
                    fetchBlock,
                },
                payload: undefined,
            });
        }
    };

    @action fetchAllowance = async (
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
            ContractTypes.TestToken,
            tokenAddress
        );

        /* Before and after the network operation, check for staleness
            If the fetch is stale, don't do network call
            If the fetch is stale after network call, don't set DB variable
        */
        const stale =
            fetchBlock <=
            this.getAllowanceLastFetched(tokenAddress, owner, spender);
        if (!stale) {
            const allowance = bnum(await token.allowance(owner, spender));
            const stale =
                fetchBlock <=
                this.getAllowanceLastFetched(tokenAddress, owner, spender);
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
                    tokenAddress,
                    owner,
                    spender,
                    fetchBlock,
                },
                payload: undefined,
            });
        }
    };

    getAllowance = (tokenAddress, account, spender): BigNumber | undefined => {
        const chainApprovals = this.allowances;
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
        tokenAddress,
        account,
        spender
    ): number | undefined => {
        const chainApprovals = this.allowances;
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

    fetchTokenIconAddress = (address): string => {
        if (address === 'ether') return 'ether';

        // Checksum addr needed for retrieval of icon from trustwallet asset repo
        const checkSumAddr = isAddress(address);
        // ??????? What should the UX be like here?
        if (!checkSumAddr) {
            throw new Error(`Token address in wrong format.`);
        }

        const chainName = getSupportedChainName();

        // kovan icons still retrieved from meta data.
        // trustwallet asset repo used for mainnet token addresses.
        if (chainName === 'kovan') {
            const { contractMetadataStore } = this.rootStore;
            return contractMetadataStore.getWhiteListedTokenIcon(address);
        } else {
            return checkSumAddr;
        }
    };

    async getTokenBalance(
        tokenAddr,
        account,
        tokenContract,
        decimals,
        precision
    ) {
        // Try whitelisted pre-loaded balances first to avoid another call

        const whiteListedBalanceBn = this.getBalance(tokenAddr, account);

        if (whiteListedBalanceBn) {
            console.log(
                `[Token] Using whitelisted Balance: `,
                whiteListedBalanceBn.toString()
            );

            const balanceFormatted = formatBalanceTruncated(
                whiteListedBalanceBn,
                decimals,
                precision,
                20
            );

            return {
                balanceBn: whiteListedBalanceBn,
                balanceFormatted: balanceFormatted,
            };
        } else if (account) {
            console.log(`[Token] Getting On-Chain Balance: ${tokenAddr}`);
            const balanceWei = await tokenContract.balanceOf(account);
            const balanceFormatted = formatBalanceTruncated(
                bnum(balanceWei),
                decimals,
                precision,
                20
            );

            return {
                balanceBn: bnum(balanceWei),
                balanceFormatted: balanceFormatted,
            };
        } else {
            return { balanceBn: bnum(0), balanceFormatted: '0.00' };
        }
    }

    fetchOnChainTokenMetadata = async (address: string, account: string) => {
        console.log(`[Token] fetchOnChainTokenMetadata: ${address}`);

        let iconAddress;

        try {
            iconAddress = this.fetchTokenIconAddress(address);
        } catch (err) {
            throw new Error('Incorrect Address Format');
        }

        let tokenMetadata;

        if (address === EtherKey) {
            const { providerStore } = this.rootStore;

            tokenMetadata = {
                address: address,
                symbol: 'ETH',
                decimals: 18,
                iconAddress: 'ether',
                precision: 4,
                balanceBn: bnum(0),
                balanceFormatted: '0.00',
            };

            if (account) {
                const library = providerStore.providerStatus.library;

                const balanceWei = await library.getBalance(account);
                const balanceFormatted = formatBalanceTruncated(
                    bnum(balanceWei),
                    18,
                    4,
                    20
                );

                tokenMetadata = {
                    address: address,
                    symbol: 'ETH',
                    decimals: 18,
                    iconAddress: 'ether',
                    precision: 4,
                    balanceBn: bnum(balanceWei),
                    balanceFormatted: balanceFormatted,
                };
            }
        } else {
            try {
                // symbol/decimal call will fail if not an actual token.
                const { providerStore, contractMetadataStore } = this.rootStore;

                const tokenContract = providerStore.getContract(
                    ContractTypes.TestToken,
                    address
                );

                const tokenDecimals = await tokenContract.decimals();

                let tokenSymbol;
                try {
                    tokenSymbol = await tokenContract.symbol();
                } catch (err) {
                    console.log('[Token] Trying TokenBytes');
                    const tokenContractBytes = providerStore.getContract(
                        ContractTypes.TestTokenBytes,
                        address
                    );

                    const tokenSymbolBytes = await tokenContractBytes.symbol();
                    tokenSymbol = ethers.utils.parseBytes32String(
                        tokenSymbolBytes
                    );
                }

                const precision = contractMetadataStore.getWhiteListedTokenPrecision(
                    address
                );

                const balance = await this.getTokenBalance(
                    address,
                    account,
                    tokenContract,
                    tokenDecimals,
                    precision
                );

                tokenMetadata = {
                    address: address,
                    symbol: tokenSymbol,
                    decimals: tokenDecimals,
                    iconAddress: iconAddress,
                    precision: precision,
                    balanceBn: balance.balanceBn,
                    balanceFormatted: balance.balanceFormatted,
                };
            } catch (error) {
                throw new Error('Non-Supported Token Address');
            }
        }

        return tokenMetadata;
    };

    // Called by SwapForm.tsx
    @action setSelectedTokenMetadata = async (
        isInputToken: boolean,
        address: string,
        account: string
    ) => {
        console.log(`[Token] setSelectedTokenMetadata: ${address}`);

        try {
            const tokenMetadata = await this.fetchOnChainTokenMetadata(
                address,
                account
            );

            if (isInputToken) {
                this.inputToken = tokenMetadata;
            } else {
                this.outputToken = tokenMetadata;
            }
        } catch (err) {
            // console.log(err);
            const { swapFormStore } = this.rootStore;
            swapFormStore.setErrorMessage(err.message);
        }
    };
}
