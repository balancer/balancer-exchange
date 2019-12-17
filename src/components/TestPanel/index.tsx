import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { backup, injected } from 'provider/connectors';
import { useEagerConnect, useInactiveListener } from 'provider/index';
import { web3ContextNames } from 'provider/connectors';
import { useStores } from 'contexts/storesContext';
import { Grid, TextField, Button } from '@material-ui/core';
import { observer } from 'mobx-react';
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator';
import * as helpers from 'utils/helpers';

const TestPanel = observer(() => {
  return (
    <Grid container spacing = {1}>
      <Grid item xs={12}>
        <Button>Max Approval</Button>
        <Button>Mint</Button>
      </Grid>
    </Grid>
  )
});