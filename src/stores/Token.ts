import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ContractTypes } from 'stores/Provider';
import * as helpers from 'utils/helpers';
import { bnum, formatBalanceTruncated } from 'utils/helpers';
import { FetchCode } from './Transaction';
import { BigNumber } from 'utils/bignumber';
import { MAX_UINT } from 'utils/helpers';
import { Interface } from 'ethers/utils';
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
    name: string;
    decimals: number;
    hasIcon: boolean;
    precision: number;
    balanceFormatted?: string;
    balanceBn?: BigNumber;
    allowance?: BigNumber;
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
    @observable balances: TokenBalanceMap;
    @observable allowances: UserAllowanceMap;
    @observable contractMetadata: ContractMetadataMap;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.balances = {} as TokenBalanceMap;
        this.allowances = {} as UserAllowanceMap;
        this.contractMetadata = {} as ContractMetadataMap;
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

    setAllowances(
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

    setBalances(
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

    private setDecimals(tokens: string[], decimals: number[]) {
        const { contractMetadataStore } = this.rootStore;

        let index = 0;
        tokens.forEach(tokenAddr => {
            if (tokenAddr === EtherKey) {
                contractMetadataStore.setTokenDecimals(tokenAddr, 18);
            } else {
                contractMetadataStore.setTokenDecimals(
                    tokenAddr,
                    decimals[index]
                );
                index += 1;
            }
        });
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
        const decimalsCalls = [];
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

                decimalsCalls.push([
                    address,
                    iface.functions.decimals.encode([]),
                ]);
            }
        });

        promises.push(multi.aggregate(balanceCalls));
        promises.push(multi.aggregate(allowanceCalls));
        promises.push(multi.getEthBalance(account));
        promises.push(multi.aggregate(decimalsCalls));

        try {
            const [
                [balBlock, mulBalance],
                [allBlock, mulAllowance],
                mulEth,
                [, mulDecimals],
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

            const decimalsList = mulDecimals.map(value =>
                bnum(iface.functions.decimals.decode(value)).toNumber()
            );

            this.setAllowances(
                tokenList,
                account,
                contractMetadataStore.getProxyAddress(),
                allowances,
                allBlock.toNumber()
            );

            this.setDecimals(tokenList, decimalsList);
            this.setBalances(tokenList, balances, account, balBlock.toNumber());
            console.debug('[All Fetches Success]');
        } catch (e) {
            console.error('[Fetch] Balancer Token Data', { error: e });
            return FetchCode.FAILURE;
        }
        return FetchCode.SUCCESS;
    };

    @action fetchOnChainTokenDecimals = async (
        tokensToTrack: string[]
    ): Promise<FetchCode> => {
        const {
            providerStore,
            contractMetadataStore,
            swapFormStore,
        } = this.rootStore;
        const promises: Promise<any>[] = [];
        const decimalsCalls = [];
        const tokenList = [];

        console.log('[Token] fetchOnChainTokenDecimals');

        const multiAddress = contractMetadataStore.getMultiAddress();
        const multi = providerStore.getContract(
            ContractTypes.Multicall,
            multiAddress
        );

        const iface = new Interface(tokenAbi);

        tokensToTrack.forEach(address => {
            tokenList.push(address);
            if (address !== EtherKey) {
                decimalsCalls.push([
                    address,
                    iface.functions.decimals.encode([]),
                ]);
            }
        });

        promises.push(multi.aggregate(decimalsCalls));

        try {
            const [[, mulDecimals]] = await Promise.all(promises);

            const decimalsList = mulDecimals.map(value =>
                bnum(iface.functions.decimals.decode(value))
            );
            this.setDecimals(tokenList, decimalsList);
            console.log('[Token] fetchOnChainTokenDecimals Finished');
            swapFormStore.updateSelectedTokenMetaData(undefined);
        } catch (e) {
            console.log('[Token] fetchOnChainTokenDecimals Error', {
                error: e,
            });
            return FetchCode.FAILURE;
        }
        return FetchCode.SUCCESS;
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

    fetchOnChainTokenMetadata = async (
        address: string,
        account: string
    ): Promise<TokenMetadata> => {
        console.log(`[Token] fetchOnChainTokenMetadata: ${address} ${account}`);

        const { providerStore, contractMetadataStore } = this.rootStore;

        let tokenMetadata;
        const proxyAddress = contractMetadataStore.getProxyAddress();

        if (address === EtherKey) {
            tokenMetadata = {
                address: address,
                symbol: 'ETH',
                name: 'Ether',
                decimals: 18,
                hasIcon: true,
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
                    name: 'Ether',
                    decimals: 18,
                    hasIcon: true,
                    precision: 4,
                    balanceBn: bnum(balanceWei),
                    balanceFormatted: balanceFormatted,
                    allowance: MAX_UINT,
                };
            }
        } else {
            try {
                // symbol/decimal call will fail if not an actual token.
                const tokenContract = providerStore.getContract(
                    ContractTypes.TestToken,
                    address
                );

                const tokenDecimals = await tokenContract.decimals();

                let tokenSymbol;
                let tokenName;
                try {
                    tokenSymbol = await tokenContract.symbol();
                    tokenName = await tokenContract.name();
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
                    const tokenNameBytes = await tokenContractBytes.name();
                    tokenName = ethers.utils.parseBytes32String(tokenNameBytes);
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

                let allowance = bnum(0);
                if (account) {
                    allowance = this.getAllowance(
                        address,
                        account,
                        proxyAddress
                    );
                    if (!allowance) {
                        console.log(
                            `[Token] Checking on-chain allowance ${tokenSymbol}`
                        );
                        const allowanceOnChain = await tokenContract.allowance(
                            account,
                            proxyAddress
                        );
                        allowance = bnum(allowanceOnChain.toString());
                    }
                    console.log(
                        `[Token] Allowance ${tokenSymbol}: `,
                        allowance.toString()
                    );
                }

                tokenMetadata = {
                    address: address,
                    symbol: tokenSymbol,
                    name: tokenName,
                    decimals: tokenDecimals,
                    hasIcon: true,
                    precision: precision,
                    balanceBn: balance.balanceBn,
                    balanceFormatted: balance.balanceFormatted,
                    allowance: allowance,
                };
            } catch (error) {
                throw new Error('Non-Supported Token Address');
            }
        }
        return tokenMetadata;
    };
}
