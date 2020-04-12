import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Check } from 'react-feather';
import { getEtherscanLink } from 'utils/helpers';
import Circle from '../../assets/images/circle.svg';
import { useStores } from '../../contexts/storesContext';

const TransactionStatusWrapper = styled.div`
    display: flex;
    align-items: center;
    min-width: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    a {
        color: var(--link-text);
        font-weight: 500;
        font-size: 14px;
    }
`;

const TransactionWrapper = styled.div`
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    width: 100%;
    margin-top: 0.75rem;
    a {
        /* flex: 1 1 auto; */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        max-width: 250px;
    }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.img`
    animation: 2s ${rotate} linear infinite;
    width: 16px;
    height: 16px;
`;

const TransactionState = styled.div`
    display: flex;
    color: ${({ pending, theme }) => (pending ? '#DC6BE5' : '#27AE60')};
    padding: 0.5rem 0.75rem;
    font-weight: 500;
    font-size: 0.75rem;
    #pending {
        animation: 2s ${rotate} linear infinite;
    }
`;

export default function Transaction({ hash, pending }) {
    const {
        root: { providerStore },
    } = useStores();

    const chainId = providerStore.providerStatus.chainId;

    return (
        <TransactionWrapper key={hash}>
            {pending ? (
                <TransactionState pending={pending}>
                    <Spinner src={Circle} id="pending" />
                </TransactionState>
            ) : (
                <TransactionState pending={pending}>
                    <Check size="16" />
                </TransactionState>
            )}
            <TransactionStatusWrapper>
                <a
                    href={getEtherscanLink(chainId, hash, 'transaction')}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {hash} ↗{' '}
                </a>
            </TransactionStatusWrapper>
        </TransactionWrapper>
    );
}
