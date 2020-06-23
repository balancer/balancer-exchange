import React from 'react';
import { HashRouter, Redirect, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import Web3ReactManager from 'components/Web3ReactManager';
import Header from 'components/Header';
import SwapForm from 'components/SwapForm';
import './App.css';

const Footer = styled.div`
    height: 60px;
    display: flex;
    justify-content: space-between;
`;

const Link = styled.a`
    margin: 0 20px;
    display: flex;
    align-items: center;
    color: var(--header-text);
    text-decoration: none;
`;

const BuildVersion = styled.div`
    margin: 0 20px;
    display: flex;
    align-items: center;
    font-size: 10px;
    color: var(--body-text);
    @media screen and (max-width: 1024px) {
        display: none;
    }
`;

const BuildLink = styled.a`
    color: var(--body-text);
    text-decoration: none;
    margin-left: 5px;
`;

const App = () => {
    const PoolSwapView = props => {
        const { tokenIn, tokenOut } = props.match.params;

        return <SwapForm tokenIn={tokenIn} tokenOut={tokenOut} />;
    };

    const buildId = process.env.REACT_APP_COMMIT_REF || '';

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
                <Footer>
                    <BuildVersion>
                        BUILD ID:{' '}
                        <BuildLink
                            href={`https://github.com/balancer-labs/balancer-exchange/tree/${buildId}`}
                            target="_blank"
                        >
                            {buildId.substring(0, 12)}
                            asdfasdf
                        </BuildLink>
                    </BuildVersion>
                    <Link
                        href="https://pools.balancer.exchange"
                        target="_blank"
                    >
                        Add Liquidity
                    </Link>
                </Footer>
            </HashRouter>
        </Web3ReactManager>
    );
};

export default App;
