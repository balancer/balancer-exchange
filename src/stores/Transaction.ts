import { action, observable } from 'mobx';
import { providers } from 'ethers';
import RootStore from 'stores/Root';
import { TransactionResponse } from 'ethers/providers';

export interface TransactionRecord {
    hash: string;
    response: providers.TransactionResponse;
    blockNumberChecked: number;
    receipt: providers.TransactionReceipt | undefined;
}

const ERRORS = {
    unknownTxHash: 'Transaction hash is not stored',
    unknownNetworkId: 'NetworkID specified is not tracked',
    txHashAlreadyExists: 'Transaction hash already exists for network',
    txHasNoHash: 'Attempting to add transaction record without hash',
};

export enum FetchCode {
    SUCCESS,
    FAILURE,
    STALE,
}

export interface TransactionRecordMap {
    [index: string]: TransactionRecord[];
}

export default class TransactionStore {
    @observable txRecords: TransactionRecordMap;
    rootStore: RootStore;

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.txRecords = {} as TransactionRecordMap;
    }

    // @dev Transactions are pending if we haven't seen their receipt yet
    getPendingTransactions(account: string): TransactionRecord[] {
        if (this.txRecords[account]) {
            const records = this.txRecords[account];
            return records.filter(value => {
                return this.isTxPending(value);
            });
        }

        return [] as TransactionRecord[];
    }

    getConfirmedTransactions(account: string): TransactionRecord[] {
        if (this.txRecords[account]) {
            const records = this.txRecords[account];
            return records.filter(value => {
                return !this.isTxPending(value);
            });
        }

        return [] as TransactionRecord[];
    }

    hasPendingTransactions(account: string): boolean {
        let pending = this.getPendingTransactions(account);
        if (pending.length > 0) return true;
        return false;
    }

    @action async checkPendingTransactions(account): Promise<FetchCode> {
        const { providerStore } = this.rootStore;
        const currentBlock = providerStore.getCurrentBlockNumber();

        const library = providerStore.providerStatus.library;
        if (this.txRecords[account]) {
            const records = this.txRecords[account];
            records.forEach(value => {
                if (
                    this.isTxPending(value) &&
                    this.isStale(value, currentBlock)
                ) {
                    library
                        .getTransactionReceipt(value.hash)
                        .then(receipt => {
                            value.blockNumberChecked = currentBlock;
                            if (receipt) {
                                value.receipt = receipt;
                            }
                        })
                        .catch(() => {
                            value.blockNumberChecked = currentBlock;
                        });
                }
            });
        }

        return FetchCode.SUCCESS;
    }

    // @dev Add transaction record. It's in a pending state until mined.
    @action addTransactionRecord(
        account: string,
        txResponse: TransactionResponse
    ) {
        const record: TransactionRecord = {
            hash: txResponse.hash,
            response: txResponse,
            blockNumberChecked: 0,
            receipt: undefined,
        };

        const txHash = txResponse.hash;

        if (!txHash) {
            throw new Error(
                'Attempting to add transaction record without hash'
            );
        }

        let records = this.txRecords[account];

        if (records) {
            const duplicate = records.find(value => value.hash === txHash);
            if (!!duplicate) {
                throw new Error(ERRORS.txHashAlreadyExists);
            }
            this.txRecords[account].push(record);
        } else {
            this.txRecords[account] = [] as TransactionRecord[];
            this.txRecords[account].push(record);
        }
    }

    private isTxPending(txRecord: TransactionRecord): boolean {
        return !txRecord.receipt;
    }

    private isStale(txRecord: TransactionRecord, currentBlock: number) {
        return txRecord.blockNumberChecked < currentBlock;
    }
}
