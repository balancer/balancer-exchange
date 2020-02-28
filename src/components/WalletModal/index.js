import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { isMobile } from 'react-device-detect';
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core';
import { observer } from 'mobx-react';

import Modal from '../Modal';
import AccountDetails from '../AccountDetails';
import PendingView from './PendingView';
import Option from './Option';
import { usePrevious } from 'utils/helperHooks';
import { Link } from '../../theme';
import MetamaskIcon from 'assets/images/metamask.png';
import { ReactComponent as Close } from '../../assets/images/x.svg';
import { injected, SUPPORTED_WALLETS } from 'provider/connectors';
import { useStores } from 'contexts/storesContext';
import {
    isChainIdSupported,
    web3ContextNames,
} from '../../provider/connectors';
import { useActiveWeb3React } from 'provider/providerHooks';

const CloseIcon = styled.div`
    position: absolute;
    color: var(--header-text);
    right: 1rem;
    top: 14px;
    &:hover {
        cursor: pointer;
        opacity: 0.6;
    }
`;

const CloseColor = styled(Close)`
    path {
        stroke: ${({ theme }) => theme.chaliceGray};
    }
`;

const Wrapper = styled.div`
    ${({ theme }) => theme.flexColumnNoWrap}
    margin: 0;
    padding: 0;
    width: 100%;
    background-color: ${({ theme }) => theme.backgroundColor};
    border-radius: 10px;
`;

const HeaderRow = styled.div`
    ${({ theme }) => theme.flexRowNoWrap};
    padding: 1.5rem 1.5rem;
    font-weight: 500;
    color: #fafafa;
    ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`;

const ContentWrapper = styled.div`
    background-color: var(--panel-background);
    color: var(--body-text);
    padding: 2rem;
    ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`;

const UpperSection = styled.div`
    position: relative;
    background-color: var(--panel-background);

    h5 {
        margin: 0;
        margin-bottom: 0.5rem;
        font-size: 1rem;
        font-weight: 400;
    }

    h5:last-child {
        margin-bottom: 0px;
    }

    h4 {
        margin-top: 0;
        font-weight: 500;
    }
`;

const Blurb = styled.div`
    ${({ theme }) => theme.flexRowNoWrap}
    align-items: center;
    justify-content: center;
    margin-top: 2rem;
    ${({ theme }) => theme.mediaWidth.upToMedium`
    margin: 1rem;
    font-size: 12px;
  `};
`;

const OptionGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 10px;
    ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 10px;
  `};
`;

const HoverText = styled.div`
    :hover {
        cursor: pointer;
    }
`;

const WALLET_VIEWS = {
    OPTIONS: 'options',
    OPTIONS_SECONDARY: 'options_secondary',
    ACCOUNT: 'account',
    PENDING: 'pending',
};

const WalletModal = observer(
    ({ pendingTransactions, confirmedTransactions }) => {
        const {
            root: { modalStore },
        } = useStores();
        const { active, connector, error, activate } = useActiveWeb3React();

        const { account, chainId: injectedChainId } = useWeb3React(
            web3ContextNames.injected
        );

        const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT);
        const [pendingWallet, setPendingWallet] = useState();
        const [pendingError, setPendingError] = useState();

        const walletModalOpen = modalStore.walletModalVisible;

        const toggleWalletModal = () => {
            modalStore.toggleWalletModal();
        };

        // always reset to account view
        useEffect(() => {
            if (walletModalOpen) {
                setPendingError(false);
                setWalletView(WALLET_VIEWS.ACCOUNT);
            }
        }, [walletModalOpen]);

        // close modal when a connection is successful
        const activePrevious = usePrevious(active);
        const connectorPrevious = usePrevious(connector);
        useEffect(() => {
            if (
                walletModalOpen &&
                ((active && !activePrevious) ||
                    (connector && connector !== connectorPrevious && !error))
            ) {
                setWalletView(WALLET_VIEWS.ACCOUNT);
            }
        }, [
            setWalletView,
            active,
            error,
            connector,
            walletModalOpen,
            activePrevious,
            connectorPrevious,
        ]);

        const tryActivation = async connector => {
            setPendingWallet(connector); // set wallet for pending view
            setWalletView(WALLET_VIEWS.PENDING);
            activate(connector, undefined, true).catch(e => {
                console.log('[Activation Error]', e);
                setPendingError(true);
            });
        };

        // get wallets user can switch too, depending on device/browser
        function getOptions() {
            const isMetamask = window.ethereum && window.ethereum.isMetaMask;
            return Object.keys(SUPPORTED_WALLETS).map(key => {
                const option = SUPPORTED_WALLETS[key];
                // check for mobile options
                if (isMobile) {
                    if (!window.web3 && !window.ethereum && option.mobile) {
                        return (
                            <Option
                                onClick={() => {
                                    option.connector !== connector &&
                                        !option.href &&
                                        tryActivation(option.connector);
                                }}
                                key={key}
                                active={
                                    option.connector &&
                                    option.connector === connector
                                }
                                color={option.color}
                                link={option.href}
                                header={option.name}
                                subheader={null}
                                icon={require('../../assets/images/' +
                                    option.iconName)}
                            />
                        );
                    }
                    return null;
                }

                // overwrite injected when needed
                if (option.connector === injected) {
                    // don't show injected if there's no injected provider
                    if (!(window.web3 || window.ethereum)) {
                        if (option.name === 'MetaMask') {
                            return (
                                <Option
                                    key={key}
                                    color={'#E8831D'}
                                    header={'Install Metamask'}
                                    subheader={null}
                                    link={'https://metamask.io/'}
                                    icon={MetamaskIcon}
                                />
                            );
                        } else {
                            return null; //dont want to return install twice
                        }
                    }
                    // don't return metamask if injected provider isn't metamask
                    else if (option.name === 'MetaMask' && !isMetamask) {
                        return null;
                    }
                    // likewise for generic
                    else if (option.name === 'Injected' && isMetamask) {
                        return null;
                    }
                }

                // return rest of options
                return (
                    !isMobile &&
                    !option.mobileOnly && (
                        <Option
                            onClick={() => {
                                option.connector === connector
                                    ? setWalletView(WALLET_VIEWS.ACCOUNT)
                                    : !option.href &&
                                      tryActivation(option.connector);
                            }}
                            key={key}
                            active={option.connector === connector}
                            color={option.color}
                            link={option.href}
                            header={option.name}
                            subheader={null} //use option.descriptio to bring back multi-line
                            icon={require('../../assets/images/' +
                                option.iconName)}
                        />
                    )
                );
            });
        }

        function getModalContent() {
            if (error) {
                return (
                    <UpperSection>
                        <CloseIcon onClick={toggleWalletModal}>
                            <CloseColor alt={'close icon'} />
                        </CloseIcon>
                        <HeaderRow>
                            {error instanceof UnsupportedChainIdError
                                ? 'Wrong Network'
                                : 'Error connecting'}
                        </HeaderRow>
                        <ContentWrapper>
                            {error instanceof UnsupportedChainIdError ? (
                                <h5>
                                    Please connect to the main Ethereum network.
                                </h5>
                            ) : (
                                'Error connecting. Try refreshing the page.'
                            )}
                        </ContentWrapper>
                    </UpperSection>
                );
            }
            if (
                account &&
                !isChainIdSupported(injectedChainId) &&
                walletView === WALLET_VIEWS.ACCOUNT
            ) {
                return (
                    <UpperSection>
                        <CloseIcon onClick={toggleWalletModal}>
                            <CloseColor alt={'close icon'} />
                        </CloseIcon>
                        <HeaderRow>{'Wrong Network'}</HeaderRow>
                        <ContentWrapper>
                            <h5>
                                Please connect to the main Ethereum network.
                            </h5>
                        </ContentWrapper>
                    </UpperSection>
                );
            }
            if (account && walletView === WALLET_VIEWS.ACCOUNT) {
                return (
                    <AccountDetails
                        toggleWalletModal={toggleWalletModal}
                        pendingTransactions={pendingTransactions}
                        confirmedTransactions={confirmedTransactions}
                        openOptions={() => setWalletView(WALLET_VIEWS.OPTIONS)}
                    />
                );
            }
            return (
                <UpperSection>
                    <CloseIcon onClick={toggleWalletModal}>
                        <CloseColor alt={'close icon'} />
                    </CloseIcon>
                    {walletView !== WALLET_VIEWS.ACCOUNT ? (
                        <HeaderRow color="blue">
                            <HoverText
                                onClick={() => {
                                    setPendingError(false);
                                    setWalletView(WALLET_VIEWS.ACCOUNT);
                                }}
                            >
                                Back
                            </HoverText>
                        </HeaderRow>
                    ) : (
                        <HeaderRow>
                            <HoverText>Connect To A Wallet</HoverText>
                        </HeaderRow>
                    )}
                    <ContentWrapper>
                        {walletView === WALLET_VIEWS.PENDING ? (
                            <PendingView
                                size={220}
                                connector={pendingWallet}
                                error={pendingError}
                                setPendingError={setPendingError}
                                tryActivation={tryActivation}
                            />
                        ) : (
                            <OptionGrid>{getOptions()}</OptionGrid>
                        )}
                        {walletView !== WALLET_VIEWS.PENDING && (
                            <Blurb>
                                <span style={{ color: '#90a4ae' }}>
                                    New to Ethereum? &nbsp;
                                </span>{' '}
                                <Link href="https://ethereum.org/use/#3-what-is-a-wallet-and-which-one-should-i-use">
                                    Learn more about wallets
                                </Link>
                            </Blurb>
                        )}
                    </ContentWrapper>
                </UpperSection>
            );
        }

        return (
            <Modal
                style={{ userSelect: 'none' }}
                isOpen={walletModalOpen}
                onDismiss={toggleWalletModal}
                minHeight={null}
                maxHeight={90}
            >
                <Wrapper>{getModalContent()}</Wrapper>
            </Modal>
        );
    }
);

export default WalletModal;
