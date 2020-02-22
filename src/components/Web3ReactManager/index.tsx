import React, { useEffect, useState } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import {
    backup,
    isChainIdSupported,
    web3ContextNames,
} from 'provider/connectors';
import { useEagerConnect, useInactiveListener } from 'provider/providerHooks';
import { useStores } from 'contexts/storesContext';
import { observer } from 'mobx-react';
import { useInterval } from 'utils/helperHooks';

const MessageWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 20rem;
`;

const Message = styled.h2`
    color: ${({ theme }) => theme.uniswapPink};
`;

const Web3ReactManager = observer(({ children }) => {
    const {
        root: { providerStore, blockchainFetchStore },
    } = useStores();

    const web3ContextInjected = useWeb3React(web3ContextNames.injected);
    const web3ContextBackup = useWeb3React(web3ContextNames.backup);
    const {
        active: injectedActive,
        chainId: injectedChainId,
    } = web3ContextInjected;
    const {
        active: networkActive,
        error: networkError,
        activate: activateNetwork,
    } = web3ContextBackup;

    providerStore.setWeb3Context(
        web3ContextNames.injected,
        web3ContextInjected
    );
    providerStore.setWeb3Context(web3ContextNames.backup, web3ContextBackup);

    const web3React = providerStore.getActiveWeb3React();

    console.log('[Web3ReactManager] Start of render', {
        injected: web3ContextInjected,
        backup: web3ContextBackup,
        web3React: web3React,
    });

    const favorInjected = injectedActive && isChainIdSupported(injectedChainId);

    // try to eagerly connect to an injected provider, if it exists and has granted access already
    const triedEager = useEagerConnect();

    // after eagerly trying injected, if the network connect ever isn't active or in an error state, activate itd
    // TODO think about not doing this at all
    useEffect(() => {
        console.log(
            '[Web3ReactManager] Activate backup if conditions are met',
            {
                triedEager,
                networkActive,
                networkError,
                injectedActive,
                activate:
                    triedEager &&
                    !networkActive &&
                    !networkError &&
                    !injectedActive,
            }
        );
        if (!networkActive && !networkError) {
            activateNetwork(backup);
            console.log('[Web3ReactManager] Backup activation started');
        }
    }, [
        triedEager,
        networkActive,
        networkError,
        activateNetwork,
        injectedActive,
    ]);

    // 'pause' the network connector if we're ever connected to an account and it's active
    useEffect(() => {
        console.log(
            '[Web3ReactManager] Pause backup if injected & backup both active',
            {
                injectedActive,
                networkActive,
                pause: injectedActive && networkActive,
            }
        );
        if (injectedActive && networkActive) {
            console.log('[Web3ReactManager] Pause backup provider');
            backup.pause();
        }
    }, [injectedActive, networkActive]);

    // 'resume' the network connector if we're ever not connected to an account and it's active
    useEffect(() => {
        console.log(
            '[Web3ReactManager] Resume backup if injected not active & backup is active',
            {
                injectedActive,
                networkActive,
                resume: !injectedActive && networkActive,
            }
        );
        if (!injectedActive && networkActive) {
            console.log('[Web3ReactManager] Resume backup provider');
            backup.resume();
        }
    }, [injectedActive, networkActive]);

    // when there's no account connected, react to logins (broadly speaking) on the injected provider, if it exists
    useInactiveListener(!triedEager);

    // handle delayed loader state
    const [showLoader, setShowLoader] = useState(true);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setShowLoader(true);
        }, 600);

        return () => {
            clearTimeout(timeout);
        };
    }, []);

    //Fetch user blockchain data on an interval using current params
    useInterval(
        () => blockchainFetchStore.setFetchLoop(web3React, false),
        web3React.account ? 1000 : null
    );

    useEffect(() => {
        if (
            web3React.account &&
            web3React.account !== providerStore.activeAccount
        ) {
            console.log('[Fetch Loop] - Extra fetch on account switch', {
                account: web3React.account,
                prevAccount: providerStore.activeAccount,
            });
            blockchainFetchStore.setFetchLoop(web3React, true);
        }
    }, [web3React]);

    // on page load, do nothing until we've tried to connect to the injected connector
    if (!triedEager) {
        console.log('[Web3ReactManager] Render: Eager load not tried');
        return null;
    }

    // if the account context isn't active, and there's an error on the network context, it's an irrecoverable error
    if (!injectedActive && networkError) {
        return (
            <MessageWrapper>
                <Message>unknownError</Message>
            </MessageWrapper>
        );
    }

    // if neither context is active, spin
    if (!injectedActive && !networkActive) {
        console.log(
            '[Web3ReactManager] Render: No active network, show loading'
        );
        return showLoader ? (
            <MessageWrapper>
                <Message>Loading</Message>
            </MessageWrapper>
        ) : null;
    }

    console.log('[Web3ReactManager] Render: Active network, render children', {
        injectedActive,
        networkActive,
    });
    return children;
});

export default Web3ReactManager;
