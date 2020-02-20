import { useEffect, useState } from 'react';
import { useWeb3React as useWeb3ReactCore } from '@web3-react/core';
import { isMobile } from 'react-device-detect';
import { injected, web3ContextNames } from 'provider/connectors';
import { supportedChainId } from './connectors';

/*  Attempt to connect to & activate injected connector
    If we're on mobile and have an injected connector, attempt even if not authorized (legacy support)
    If we tried to connect, or it's active, return true;
 */
export function useActiveWeb3React() {
    const contextBackup = useWeb3ReactCore(web3ContextNames.backup);
    const contextInjected = useWeb3ReactCore(web3ContextNames.injected);

    return contextInjected.active &&
        contextInjected.chainId === supportedChainId
        ? contextInjected
        : contextBackup;
}

export function useEagerConnect() {
    const { activate, active } = useWeb3ReactCore(web3ContextNames.injected);

    const [tried, setTried] = useState(false);

    useEffect(() => {
        console.log('[Injected Eager Connect]', injected);
        injected.isAuthorized().then(isAuthorized => {
            console.log('[Eager Connect] Activate injected if authorized', {
                isAuthorized,
            });
            if (isAuthorized) {
                activate(injected, undefined, true).catch(() => {
                    setTried(true);
                });
            } else {
                if (isMobile && window.ethereum) {
                    activate(injected, undefined, true).catch(() => {
                        setTried(true);
                    });
                } else {
                    setTried(true);
                }
            }
        });
    }, [activate]); // intentionally only running on mount (make sure it's only mounted once :))

    // if the connection worked, wait until we get confirmation of that to flip the flag
    useEffect(() => {
        if (active) {
            setTried(true);
        }
    }, [active]);

    return tried;
}

/**
 * Use for network and injected - logs user in
 * and out after checking what network they're on
 */
export function useInactiveListener(suppress = false) {
    const { active, error, activate } = useWeb3ReactCore(
        web3ContextNames.injected
    );

    useEffect(() => {
        const { ethereum } = window;

        if (ethereum && ethereum.on && !active && !error && !suppress) {
            const handleChainChanged = () => {
                // eat errors
                activate(injected, undefined, true).catch(() => {});
            };

            const handleAccountsChanged = accounts => {
                if (accounts.length > 0) {
                    // eat errors
                    activate(injected, undefined, true).catch(() => {});
                }
            };

            const handleNetworkChanged = () => {
                // eat errors
                activate(injected, undefined, true).catch(() => {});
            };

            ethereum.on('chainChanged', handleChainChanged);
            ethereum.on('networkChanged', handleNetworkChanged);
            ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                if (ethereum.removeListener) {
                    ethereum.removeListener('chainChanged', handleChainChanged);
                    ethereum.removeListener(
                        'networkChanged',
                        handleNetworkChanged
                    );
                    ethereum.removeListener(
                        'accountsChanged',
                        handleAccountsChanged
                    );
                }
            };
        }

        return () => {};
    }, [active, error, suppress, activate]);
}
