import React, { Component } from 'react';
import { HashRouter, Route, Redirect, Switch } from 'react-router-dom';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { theme } from 'configs';
import { Header, Web3ReactManager } from 'components';
import SwapView from 'views/SwapView';
import './styles.scss'; // global styles
import { Container } from '@material-ui/core';
import { useWeb3React } from '@web3-react/core';

const App = () => {
    console.log(process.env.REACT_APP_NETWORK_PROVIDER_URL);

    const renderViews = () => {
        return (
            <Container>
                <div className="app-shell">
                    <Switch>
                        <Route
                            path="/swap/:tokenIn?/:tokenOut?"
                            component={SwapView}
                        />
                        <Redirect from="/" to="/swap" />
                    </Switch>
                </div>
            </Container>
        );
    };

    return (
        <Web3ReactManager>
            <MuiThemeProvider theme={theme}>
                <HashRouter>
                        <Header />
                        {renderViews()}
                </HashRouter>
            </MuiThemeProvider>
        </Web3ReactManager>
    );
};

export default App;
