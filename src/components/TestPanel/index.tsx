import React, { useState, useEffect, useRef } from 'react';
import { useWeb3React } from '@web3-react/core';
import styled from 'styled-components';
import { backup, injected } from 'provider/connectors';
import { useEagerConnect, useInactiveListener } from 'provider/index';
import { web3ContextNames } from 'provider/connectors';
import { useStores } from 'contexts/storesContext';
import { Grid, TextField, Button, Container } from '@material-ui/core';
import { observer } from 'mobx-react';
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator';
import * as helpers from 'utils/helpers';
import { formNames, labels } from '../../stores/SwapForm';
import { validators } from '../validators';

const TestPanel = observer(() => {
    const {
        root: { proxyStore, providerStore, swapFormStore, tokenStore },
    } = useStores();

  const { account } = providerStore.getActiveWeb3React();

  const [approvalToken, setApprovalToken] = useState("");
  const [mintToken, setMintToken] = useState("");
  const [mintAmount, setMintAmount] = useState("");

    const maxApproval = () => {
      tokenStore.approveMax(approvalToken, account);
    };
    const mint = () => {
      tokenStore.mint(mintToken, mintAmount);
    };

    const tokenList = swapFormStore.getTokenList();

    if (helpers.checkIsPropertyEmpty(mintToken)) {
        setMintToken(tokenList[0].address);
    }

    if (helpers.checkIsPropertyEmpty(approvalToken)) {
        setApprovalToken(tokenList[1].address);
    }

    return (
        <Grid container spacing={1}>
            <Grid item xs={12} sm={12}>
                <ValidatorForm
                    ref={useRef('form')}
                    onSubmit={mint}
                    onError={errors => console.log(errors)}
                >
                    <Grid container spacing={1}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                id="mint-token"
                                name="mintToken"
                                select
                                label="Mint Token"
                                value={mintToken}
                                onChange={e =>
                                    setMintToken(e.target.value)
                                }
                                SelectProps={{
                                    native: true,
                                }}
                                margin="normal"
                                variant="outlined"
                                fullWidth
                            >
                                {tokenList.map(option => (
                                    <option
                                        key={option.address}
                                        value={option.address}
                                    >
                                        {option.symbol}
                                    </option>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextValidator
                                id="amount-in"
                                name="mintAmount"
                                label="Mint Amount"
                                value={mintAmount}
                                onChange={e =>
                                  setMintAmount(e.target.value)
                                }
                                type="number"
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                margin="normal"
                                variant="outlined"
                                fullWidth
                                validators={
                                    validators.optionalTokenValueValidators
                                }
                                errorMessages={
                                    validators.optionalTokenValueValidatorErrors
                                }
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                type="submit"
                                variant="contained"
                                style={{ marginTop: 25 }}
                            >
                                Submit
                            </Button>
                        </Grid>
                    </Grid>
                </ValidatorForm>
              <ValidatorForm
                ref={useRef('form')}
                onSubmit={maxApproval}
                onError={errors => console.log(errors)}
              >
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      id="approval-token"
                      name="approvalToken"
                      select
                      label="Approval Token"
                      value={approvalToken}
                      onChange={e =>
                        setApprovalToken(e.target.value)
                      }
                      SelectProps={{
                        native: true,
                      }}
                      margin="normal"
                      variant="outlined"
                      fullWidth
                    >
                      {tokenList.map(option => (
                        <option
                          key={option.address}
                          value={option.address}
                        >
                          {option.symbol}
                        </option>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      type="submit"
                      variant="contained"
                      style={{ marginTop: 25 }}
                    >
                      Submit
                    </Button>
                  </Grid>
                </Grid>
              </ValidatorForm>
            </Grid>
        </Grid>
    );
});

export default TestPanel;
