import React from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react';
import { useStores } from 'contexts/storesContext';
import Transaction from './Transaction';
import { TransactionRecord } from 'stores/Transaction';
import { isChainIdSupported } from '../../provider/connectors';

const TransactionListWrapper = styled.div`
    display: flex;
    flex-flow: column nowrap;
`;

const Panel = styled.div`
    text-align: left;
    display: flex;
    flex-flow: column nowrap;
    padding-top: 2rem;
    flex-grow: 1;
    overflow: auto;
    background-color: var(--panel-background);
`;

const TransactionHeader = styled.div`
    border-top: 1px solid var(--panel-border);
    align-items: left;
    font-family: Roboto;
    font-style: normal;
    font-weight: 500;
    font-size: 14px;
    line-height: 18px;
    padding-top: 14px;
    color: var(--token-balance-text);
    text-transform: uppercase;
`;

const TransactionPanel = observer(() => {
    const {
        root: { transactionStore, providerStore },
    } = useStores();

    const account = providerStore.providerStatus.account;
    const activeChainId = providerStore.providerStatus.activeChainId;

    let pending = undefined;
    let confirmed = undefined;

    if (account && isChainIdSupported(activeChainId)) {
        pending = transactionStore.getPendingTransactions(account);
        confirmed = transactionStore.getConfirmedTransactions(account);
    }

    function renderTransactions(transactions: TransactionRecord[], pending) {
        return (
            <TransactionListWrapper>
                {transactions.map((value, i) => {
                    return (
                        <Transaction
                            key={i}
                            hash={value.hash}
                            pending={pending}
                        />
                    );
                })}
            </TransactionListWrapper>
        );
    }

    let hasTx = !!pending.length || !!confirmed.length;

    if (hasTx) {
        return (
            <Panel>
                <TransactionHeader>Recent Transactions</TransactionHeader>
                {renderTransactions(pending, true)}
                {renderTransactions(confirmed, false)}
            </Panel>
        );
    }

    return <></>;
});

export default TransactionPanel;
