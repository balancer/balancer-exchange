import React from 'react';
import styled, { css } from 'styled-components';
import { UnsupportedChainIdError } from '@web3-react/core';
import { darken, transparentize } from 'polished';
import { Activity } from 'react-feather';
import { observer } from 'mobx-react';
import { shortenAddress } from 'utils/helpers';
import WalletModal from 'components/WalletModal';
import { Spinner } from '../../theme';
import Circle from 'assets/images/circle.svg';
import { injected } from 'provider/connectors';
import { web3ContextNames } from 'provider/connectors';
import Identicon from '../Identicon';
import { useStores } from '../../contexts/storesContext';
import Button from '../Temp/Button';
import Web3PillBox from '../Temp/Web3PillBox';
import {
    isChainIdSupported,
    supportedNetworks,
} from '../../provider/connectors';

const Web3StatusGeneric = styled.button`
    ${({ theme }) => theme.flexRowNoWrap}
    width: 100%;
    font-size: 0.9rem;
    align-items: center;
    padding: 0.5rem;
    border-radius: 2rem;
    box-sizing: border-box;
    cursor: pointer;
    user-select: none;
    :focus {
        outline: none;
    }
`;

const Web3StatusError = styled(Web3StatusGeneric)`
    background-color: ${({ theme }) => theme.salmonRed};
    border: 1px solid ${({ theme }) => theme.salmonRed};
    color: ${({ theme }) => theme.white};
    font-weight: 500;
    :hover,
    :focus {
        background-color: ${({ theme }) => darken(0.1, theme.salmonRed)};
    }
`;

const Text = styled.p`
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin: 0 0.5rem 0 0.25rem;
    font-size: 0.83rem;
`;

const NetworkIcon = styled(Activity)`
    margin-left: 0.25rem;
    margin-right: 0.5rem;
    width: 16px;
    height: 16px;
`;

const SpinnerWrapper = styled(Spinner)`
    margin: 0 0.25rem 0 0.25rem;
`;

const IconWrapper = styled.div`
    ${({ theme }) => theme.flexColumnNoWrap};
    align-items: center;
    justify-content: center;
    & > * {
        height: ${({ size }) => (size ? size + 'px' : '32px')};
        width: ${({ size }) => (size ? size + 'px' : '32px')};
    }
`;

const Web3ConnectStatus = observer(() => {
    const {
        root: { providerStore, modalStore, transactionStore },
    } = useStores();
    const {
        chainId,
        active,
        connector,
        error,
    } = providerStore.getActiveWeb3React();

    const { account, chainId: injectedChainId } = providerStore.getWeb3React(
        web3ContextNames.injected
    );

    const contextNetwork = providerStore.getWeb3React(web3ContextNames.backup);

    // Run extra blockchain fetch if account has changed
    if (account) {
        const activeAccount = providerStore.activeAccount;
        if (activeAccount !== account) {
            console.log('[Web3ConnectStatus] - Account changed', {
                oldAccount: activeAccount,
                newAccount: account,
            });
            providerStore.setActiveAccount(account);
            providerStore.fetchLoop(true);
        }
    }

    if (!chainId) {
        throw new Error('No chain ID specified');
    }

    let pending = undefined;
    let confirmed = undefined;
    let hasPendingTransactions = false;

    if (account && isChainIdSupported(injectedChainId)) {
        pending = transactionStore.getPendingTransactions(injectedChainId);
        confirmed = transactionStore.getConfirmedTransactions(injectedChainId);
        hasPendingTransactions = !!pending.size;
    }

    console.log({
        message: 'Web3ConnectStatus Pending Tx',
        pending,
        hasPendingTransactions,
    });

    const toggleWalletModal = () => {
        modalStore.toggleWalletModal();
    };

    // handle the logo we want to show with the account
    function getStatusIcon() {
        if (connector === injected) {
            return <Identicon />;
        }
    }

    function getWeb3Status() {
        console.log(['getWeb3Status'], {
            chainId,
            active,
            account,
            connector,
            error,
        });
        // Wrong network
        if (account && !isChainIdSupported(injectedChainId)) {
            return (
                <Web3StatusError onClick={toggleWalletModal}>
                    <NetworkIcon />
                    <Text> 'Wrong Network'</Text>
                </Web3StatusError>
            );
        } else if (account) {
            return (
                <Web3PillBox onClick={toggleWalletModal}>
                    {hasPendingTransactions && (
                        <SpinnerWrapper src={Circle} alt="loader" />
                    )}
                    {getStatusIcon()}
                    {shortenAddress(account)}
                </Web3PillBox>
            );
        } else if (error) {
            return (
                <Web3StatusError onClick={toggleWalletModal}>
                    <NetworkIcon />
                    <Text>
                        {error instanceof UnsupportedChainIdError
                            ? 'Wrong Network'
                            : 'Error'}
                    </Text>
                </Web3StatusError>
            );
        } else {
            return (
                <Button
                    onClick={toggleWalletModal}
                    buttonText="Connect Wallet"
                    active={true}
                />
            );
        }
    }

    if (!contextNetwork.active && !active) {
        return null;
    }

    return (
        <>
            {getWeb3Status()}
            <WalletModal
                pendingTransactions={pending}
                confirmedTransactions={confirmed}
            />
        </>
    );
});

export default Web3ConnectStatus;
