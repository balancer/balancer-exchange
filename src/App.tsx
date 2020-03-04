import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';
import Web3ReactManager from 'components/Web3ReactManager';
import Header from 'components/Header';
import GeneralNotification from 'components/GeneralNotification';
import SwapForm from 'components/SwapForm';
import './App.css';

const App = () => {
    const PoolSwapView = props => {
        const { tokenIn, tokenOut } = props.match.params;

        return <SwapForm tokenIn={tokenIn} tokenOut={tokenOut} />;
    };

    const renderViews = () => {
        return (
            <div className="app-shell">
                <Switch>
                    <Route
                        path="/swap/:tokenIn?/:tokenOut?"
                        component={PoolSwapView}
                    />
                    <Redirect from="/" to="/swap" />
                </Switch>
            </div>
        );
    };

    return (
        <Web3ReactManager>
            <HashRouter>
                <Header />
                <GeneralNotification />
                {renderViews()}
            </HashRouter>
        </Web3ReactManager>
    );
};

export default App;
