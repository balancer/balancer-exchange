import React, { Component } from 'react';
import { Typography, Container, Grid } from '@material-ui/core';
import { observer, inject } from 'mobx-react';
import { SwapForm, TestPanel } from 'components';

const PoolSwapView = props => {
    const { tokenIn, tokenOut } = props.match.params;

    return (
        <Container>
            <br />
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
                <TestPanel/>
            </Grid>

        </Container>
    );
};

export default PoolSwapView;
