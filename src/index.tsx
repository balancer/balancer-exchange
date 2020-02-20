import React from 'react';
import ReactDOM from 'react-dom';
import { createWeb3ReactRoot } from '@web3-react/core';
import { ethers } from 'ethers';
import 'index.css';
import App from 'App';
import * as serviceWorker from './serviceWorker';
import { web3ContextNames } from 'provider/connectors';
import ThemeProvider, { GlobalStyle } from './theme';

const Web3ProviderInjected = createWeb3ReactRoot(web3ContextNames.injected);
const Web3ProviderBackup = createWeb3ReactRoot(web3ContextNames.backup);

function getLibrary(provider) {
    console.log('[getLibrary]', {
        provider,
    });
    const library = new ethers.providers.Web3Provider(provider);
    library.pollingInterval = 1000;
    return library;
}

const Root = (
    <Web3ProviderBackup getLibrary={getLibrary}>
        <Web3ProviderInjected getLibrary={getLibrary}>
            <ThemeProvider>
                <>
                    <GlobalStyle />
                    <App />
                </>
            </ThemeProvider>
        </Web3ProviderInjected>
    </Web3ProviderBackup>
);
ReactDOM.render(Root, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
