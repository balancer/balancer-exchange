import React, { Component } from 'react';
import { Typography, Container, Grid } from '@material-ui/core';
import { observer, inject } from 'mobx-react';
import { SwapForm } from 'components';

@inject('root')
@observer
class PoolSwapView extends Component<any, any> {
    constructor(props) {
        super(props);

        this.state = {
            tokenIn: '',
            tokenOut: '',
        };
    }

    async componentDidMount() {
        const { tokenIn, tokenOut } = this.props.match.params;
        const { providerStore } = this.props.root;
        // poolStore.setCurrentPool(address)
        this.setState({ tokenIn, tokenOut });

        if (!providerStore.defaultAccount) {
            await providerStore.setWeb3WebClient();
        }
    }

    render() {
        const { tokenIn, tokenOut } = this.state;

        // const paramsLoaded = poolStore.isParamsLoaded(address)
        // const tokenParamsLoaded = poolStore.isTokenParamsLoaded(address)

        return (
            <Container>
                <br></br>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h3" component="h3">
                            Swap
                        </Typography>
                    </Grid>
                    <React.Fragment>
                        <Grid container>
                            <SwapForm tokenIn={tokenIn} tokenOut={tokenOut} />
                        </Grid>
                    </React.Fragment>
                </Grid>
            </Container>
        );
    }
}

export default PoolSwapView;
