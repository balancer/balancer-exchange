import React, { Component } from 'react';
import { HashRouter, Route, Redirect, Switch } from 'react-router-dom';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { theme } from 'configs';
import { Notification } from './components';
import { Header, Web3ReactManager } from 'components';
import SwapView from 'views/SwapView';
import './styles.scss'; // global styles
import { Container } from '@material-ui/core';
import { useWeb3React } from '@web3-react/core';

const App = () => {
    const web3React = useWeb3React();
    // const NotificationComponent = () => {
    //     return (
    //         <Error.Consumer>
    //             {({ error, setError }) => {
    //                 return (
    //                     <Notification
    //                         errorMessage={error}
    //                         setError={setError}
    //                     />
    //                 );
    //             }}Y
    //         </Error.Consumer>
    //     );
    // };

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

    const providerLoaded = web3React.active;

    return (
        <Web3ReactManager>
            <MuiThemeProvider theme={theme}>
                <HashRouter>
                    <div>
                        <Header />
                        {renderViews()}
                    </div>
                </HashRouter>
            </MuiThemeProvider>
        </Web3ReactManager>
    );
};

export default App;
