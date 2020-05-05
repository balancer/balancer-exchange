import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { observer } from 'mobx-react';
import { web3Window as window } from 'provider/Web3Window';
import { usePrevious } from 'utils/helperHooks';
import { useStores } from 'contexts/storesContext';
import TransactionPanel from './TransactionPanel';

const StyledLink = styled.a`
    color: #ffffff;
    cursor: pointer;
`;

const Lightbox = styled.div`
    text-align: center;
    position: fixed;
    width: 100vw;
    height: 100vh;
    margin-left: -50vw;
    top: 78px;
    pointer-events: none;
    left: 50%;
    z-index: 2;
    will-change: opacity;
    background-color: rgba(0, 0, 0, 0.4);
`;

const Wrapper = styled.div`
    background-color: var(--panel-background);
    position: absolute;
    top: 0px;
    right: 25px;
    padding: 20px;
    transition: all 0.5s ease;
    margin: 0;
    width: 300px;
    pointer-events: auto;
    z-index: 100;
    border: 1px solid var(--panel-border);
    border-radius: 0 0 4px 4px;
`;

const WALLET_VIEWS = {
    OPTIONS: 'options',
    OPTIONS_SECONDARY: 'options_secondary',
    ACCOUNT: 'account',
    PENDING: 'pending',
};

function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const handleClick = event => {
            // Do nothing if clicking ref's element or descendent elements
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }

            handler(event);
        };

        const handleKeyUp = event => {
            if (event.key !== 'Escape') {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', handleClick);
        window.addEventListener('keydown', handleKeyUp, false);
        document.addEventListener('touchstart', handleClick);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('keydown', handleKeyUp, false);
            document.removeEventListener('touchstart', handleClick);
        };
    }, [ref, handler]);
}

const WalletDropdown = observer(() => {
    const {
        root: { dropdownStore, providerStore },
    } = useStores();

    const active = providerStore.providerStatus.active;
    const error = providerStore.providerStatus.error;
    const account = providerStore.providerStatus.account;
    const injectedActive = providerStore.providerStatus.injectedActive;
    const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT);

    const walletDropdownOpen = dropdownStore.walletDropdownVisible;

    const toggleWalletDropdown = () => {
        dropdownStore.toggleWalletDropdown();
    };

    // always reset to account view
    useEffect(() => {
        if (walletDropdownOpen) {
            setWalletView(WALLET_VIEWS.ACCOUNT);
        }
    }, [walletDropdownOpen]);

    const ref = useRef();
    useOnClickOutside(ref, () => dropdownStore.toggleWalletDropdown());

    // close modal when a connection is successful
    const activePrevious = usePrevious(active);
    useEffect(() => {
        if (walletDropdownOpen && active && !activePrevious) {
            setWalletView(WALLET_VIEWS.ACCOUNT);
        }
    }, [setWalletView, active, error, walletDropdownOpen, activePrevious]);

    async function loadWalletDropdown() {
        if (walletDropdownOpen) {
            toggleWalletDropdown();
        }
        setWalletView(WALLET_VIEWS.ACCOUNT);
        await providerStore.loadWeb3Modal();
    }

    function getDropdownContent() {
        if (account && injectedActive && walletView === WALLET_VIEWS.ACCOUNT) {
            return (
                <>
                    <>
                        {(window.web3 || window.ethereum) && (
                            <StyledLink
                                onClick={() => {
                                    setWalletView(WALLET_VIEWS.OPTIONS);
                                }}
                            >
                                Connect to a different wallet
                            </StyledLink>
                        )}
                    </>
                    <TransactionPanel />
                </>
            );
        }

        if (walletDropdownOpen) {
            loadWalletDropdown();
        }
        return null;
    }

    if (walletDropdownOpen) {
        return (
            <Lightbox>
                <Wrapper ref={ref}>{getDropdownContent()}</Wrapper>
            </Lightbox>
        );
    }
});

export default WalletDropdown;
