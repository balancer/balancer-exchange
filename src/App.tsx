import React from 'react';
import { HashRouter, Route, Redirect, Switch } from 'react-router-dom';
import Web3ReactManager from 'components/Web3ReactManager';
import Header from 'components/Header';
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
                {renderViews()}
            </HashRouter>
        </Web3ReactManager>
    );
};

export default App;
