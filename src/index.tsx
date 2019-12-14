import React from 'react';
import ReactDOM from 'react-dom';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import 'index.css';
import App from 'views/App';
import * as serviceWorker from './serviceWorker';
import { Provider } from 'mobx-react';
import RootStore from 'stores/Root';

function getLibrary(provider) {
    const library = new ethers.providers.Web3Provider(provider);
    library.pollingInterval = 10000;
    return library;
}

const Root = (
    <Provider root={RootStore}>
        <Web3ReactProvider getLibrary={getLibrary}>
            <App />
        </Web3ReactProvider>
    </Provider>
);
ReactDOM.render(Root, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
