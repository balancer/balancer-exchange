import { action, observable, ObservableMap } from 'mobx';
import { providers } from 'ethers';
import RootStore from 'stores/Root';

export interface TransactionRecord {
    response: providers.TransactionResponse;
    blockNumberChecked: number;
    receipt: providers.TransactionReceipt | undefined;
}

const ERRORS = {
    unknownTxHash: 'Transaction hash is not stored',
    unknownNetworkId: 'NetworkID specified is not tracked',
    txHashAlreadyExists: 'Transaction hash already exists for network',
};

type TransactionHashMap = ObservableMap<string, TransactionRecord>;
type NetworkIdsMap = ObservableMap<number, TransactionHashMap>;

export default class TransactionStore {
    @observable allTxRecords: NetworkIdsMap;
    rootStore: RootStore;

    constructor(rootStore, networkIds: number[]) {
        this.rootStore = rootStore;
        this.allTxRecords = new ObservableMap<number, TransactionHashMap>();

        networkIds.forEach(networkId => {
            this.allTxRecords.set(
                networkId,
                new ObservableMap<string, TransactionRecord>()
            );
        });
    }

    getTransactionRecord(networkId: number, txHash: string): TransactionRecord {
        return this.safeGetTxRecord(networkId, txHash);
    }

    // @dev Transactions are pending if we haven't seen their receipt yet
    getPendingTransactions(networkId: number): TransactionHashMap {
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);
        const pending = new ObservableMap<string, TransactionRecord>();

        txRecordHashMap.forEach((value, key) => {
            if (this.isTxPending(value)) {
                pending.set(key, value);
            }
        });
        return pending;
    }

    getConfirmedTransactions(networkId: number): TransactionHashMap {
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);
        const confirmed = new ObservableMap<string, TransactionRecord>();

        txRecordHashMap.forEach((value, key) => {
            if (!this.isTxPending(value)) {
                confirmed.set(key, value);
            }
        });
        return confirmed;
    }

    @action async checkPendingTransactions(networkId: number) {
        const { providerStore } = this.rootStore;

        const currentBlock = await providerStore.getCurrentBlockNumber();
        const lib = providerStore.getActiveLibrary();
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);

        txRecordHashMap.forEach((value, key) => {
            if (this.isTxPending(value) && this.isStale(value, currentBlock)) {
                lib.getTransactionReceipt(key)
                    .then(receipt => {
                        this.setTxRecordBlockChecked(
                            networkId,
                            key,
                            currentBlock
                        );
                        if (receipt) {
                            this.setTxRecordReceipt(networkId, key, receipt);
                        }
                    })
                    .catch(() => {
                        this.setTxRecordBlockChecked(
                            networkId,
                            key,
                            currentBlock
                        );
                    });
            }
        });
    }

    // @dev Add transaction record. It's in a pending state until mined.
    @action addTransactionRecord(
        networkId: number,
        txHash: string,
        txResponse: providers.TransactionResponse
    ) {
        const txRecord: TransactionRecord = {
            response: txResponse,
            blockNumberChecked: 0,
            receipt: undefined,
        };

        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);

        if (txRecordHashMap.has(txHash)) {
            throw new Error(ERRORS.txHashAlreadyExists);
        }

        txRecordHashMap.set(txHash, txRecord);
    }

    @action setTxRecordBlockChecked(
        networkId: number,
        txHash: string,
        blockNumber: number
    ) {
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);
        const txRecord = this.safeGetTxRecord(networkId, txHash);

        txRecord.blockNumberChecked = blockNumber;
        txRecordHashMap.set(txHash, txRecord);
    }

    @action setTxRecordReceipt(
        networkId: number,
        txHash: string,
        txReceipt: providers.TransactionReceipt
    ) {
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);
        const txRecord = this.safeGetTxRecord(networkId, txHash);

        txRecord.receipt = txReceipt;
        txRecordHashMap.set(txHash, txRecord);
    }

    private safeGetTxRecordHashMap(networkId: number): TransactionHashMap {
        const txRecordHashMap = this.allTxRecords.get(networkId);
        if (!txRecordHashMap) {
            throw new Error(ERRORS.unknownNetworkId);
        }
        return txRecordHashMap;
    }

    private safeGetTxRecord(
        networkId: number,
        txHash: string
    ): TransactionRecord {
        const txRecordHashMap = this.safeGetTxRecordHashMap(networkId);
        const txRecord = txRecordHashMap.get(txHash);
        if (!txRecord) {
            throw new Error(ERRORS.unknownTxHash);
        }
        return txRecord;
    }

    private isTxPending(txRecord: TransactionRecord): boolean {
        return !txRecord.receipt;
    }

    private isStale(txRecord: TransactionRecord, currentBlock: number) {
        return txRecord.blockNumberChecked < currentBlock;
    }
}
