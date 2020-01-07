// @ts-nocheck
import React, { useRef } from 'react';
import { Button, Grid, TextField } from '@material-ui/core';
import { observer } from 'mobx-react';
import { TextValidator, ValidatorForm } from 'react-material-ui-form-validator';
import {bnum, toWei, fromWei, checkIsPropertyEmpty} from 'utils/helpers';
import { formNames, labels, SwapMethods } from 'stores/SwapForm';
import SwapResults from './SwapResults';
import { validators } from '../validators';
import { useStores } from '../../contexts/storesContext';
import { ErrorCodes, ErrorIds } from '../../stores/Error';
import { bigNumberify } from 'ethers/utils';
import { ContractMetadata } from "../../stores/Token";

const SwapForm = observer(props => {
    const {
        root: {
            proxyStore,
            swapFormStore,
            providerStore,
            tokenStore,
            errorStore,
        },
    } = useStores();

    const { chainId, account } = providerStore.getActiveWeb3React();
    const proxyAddress = tokenStore.getProxyAddress(chainId);

    if (!chainId) {
        throw new Error('ChainId not loaded in TestPanel');
    }

    const updateProperty = (form, key, value) => {
        swapFormStore[form][key] = value;
    };

    const onChange = async (event, form) => {
        console.log({
            name: event.target.name,
            value: event.target.value,
        });
        updateProperty(form, event.target.name, event.target.value);
        const { inputAmount, inputToken } = swapFormStore.inputs;

        // Get preview if all necessary fields are filled out
        if (event.target.name === 'inputAmount') {
            updateProperty(form, 'type', SwapMethods.EXACT_IN);
            const output = await previewSwapExactAmountInHandler();
            swapFormStore.updateOutputsFromObject(output);
        } else if (event.target.name === 'outputAmount') {
            updateProperty(form, 'type', SwapMethods.EXACT_OUT);
            const output = await previewSwapExactAmountOutHandler();
            swapFormStore.updateOutputsFromObject(output);
        }
    };

    const swapHandler = async () => {
        const { inputs, outputs } = swapFormStore;

        if (!outputs.validSwap) {
            return;
        }

        if (inputs.type === SwapMethods.EXACT_IN) {
            const {
                inputAmount,
                inputToken,
                outputToken,
                outputLimit,
                limitPrice,
            } = inputs;
            await proxyStore.batchSwapExactIn(
                inputToken,
                bnum(inputAmount),
                outputToken,
                toWei(outputLimit),
                toWei(limitPrice)
            );
        } else if (inputs.type === SwapMethods.EXACT_OUT) {
            const {
                inputLimit,
                inputToken,
                outputToken,
                outputAmount,
                limitPrice,
            } = inputs;
            await proxyStore.batchSwapExactOut(
                inputToken,
                toWei(inputLimit),
                outputToken,
                bnum(outputAmount),
                toWei(limitPrice)
            );
        }
    };

    const previewSwapExactAmountInHandler = async () => {
        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, inputAmount } = inputs;

        if (!inputAmount || inputAmount === '') {
            return {
                validSwap: false,
            };
        }

        const {
            preview: { outputAmount, effectivePrice, swaps },
            validSwap,
        } = await proxyStore.previewBatchSwapExactIn(
            inputToken,
            outputToken,
            inputAmount
        );

        if (validSwap) {
            return {
                outputAmount: fromWei(outputAmount),
                effectivePrice,
                swaps,
                validSwap,
            };
        } else {
            return {
                validSwap,
            };
        }
    };

    const previewSwapExactAmountOutHandler = async () => {
        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, outputAmount } = inputs;

        if (!outputAmount || outputAmount === '') {
            return {
                validSwap: false,
            };
        }

        const {
            preview: { inputAmount, effectivePrice, swaps },
            validSwap,
        } = await proxyStore.previewBatchSwapExactOut(
            inputToken,
            outputToken,
            outputAmount
        );

        if (validSwap) {
            return {
                inputAmount: fromWei(inputAmount),
                effectivePrice,
                swaps,
                validSwap,
            };
        } else {
            return {
                validSwap,
            };
        }
    };

    const { inputs, outputs } = swapFormStore;
    const { inputAmount, inputToken } = inputs;
    const tokenList = tokenStore.getWhitelistedTokenMetadata(chainId);
    // const userBalances = tokenList.map(value => {
    //     const balance = tokenStore.getBalance(chainId, value.address, account);
    //     if (balance) {
    //         return balance.toString();
    //     } else {
    //         return undefined;
    //     }
    // });

    if (checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
        swapFormStore.inputs.inputToken = tokenList[0].address;
    }

    if (checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
        swapFormStore.inputs.outputToken = tokenList[1].address;
    }

    const buttonText = account ? 'Submit' : 'Connect to a wallet';

    let userBalance;
    let userAllowance;

    if (account) {
        userBalance = tokenStore.getBalance(chainId, inputToken, account);
        userAllowance = tokenStore.getAllowance(
            chainId,
            inputToken,
            account,
            proxyAddress
        );
    }

    // if (userAllowance && userAllowance.lt(bigNumberify(inputAmount))) {
    //     errorStore.setActiveError(
    //         ErrorIds.SWAP_FORM_STORE,
    //         ErrorCodes.INSUFFICIENT_APPROVAL_FOR_SWAP
    //     );
    // } else if (userBalance && userBalance.lt(bigNumberify(inputAmount))) {
    //     errorStore.setActiveError(
    //         ErrorIds.SWAP_FORM_STORE,
    //         ErrorCodes.INSUFFICIENT_BALANCE_FOR_SWAP
    //     );
    // }

    const error = errorStore.getActiveError(ErrorIds.SWAP_FORM_STORE);
    let errorMessage;

    if (error) {
        console.log('error', error);
        errorMessage = (
            <Grid item xs={12} sm={6}>
                <div>{error.message}</div>
            </Grid>
        );
    }

    console.log('[SwapForm] Render');

    return (
        <div>
            <Grid container spacing={1}>
                <Grid item xs={12} sm={12}>
                    <ValidatorForm
                        ref={useRef('form')}
                        onSubmit={() => {
                            swapHandler();
                        }}
                        onError={errors => console.log(errors)}
                    >
                        <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    id="token-in"
                                    name="inputToken"
                                    select
                                    label={labels.inputs.INPUT_TOKEN}
                                    value={inputs.inputToken}
                                    onChange={e =>
                                        onChange(e, formNames.INPUT_FORM)
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
                            <Grid item xs={12} sm={6}>
                                <TextValidator
                                    id="amount-in"
                                    name="inputAmount"
                                    label={labels.inputs.INPUT_AMOUNT}
                                    value={inputs.inputAmount}
                                    onChange={e =>
                                        onChange(e, formNames.INPUT_FORM)
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
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    id="token-out"
                                    name="outputToken"
                                    select
                                    fullWidth
                                    label={labels.inputs.OUTPUT_TOKEN}
                                    value={inputs.outputToken}
                                    onChange={e =>
                                        onChange(e, formNames.INPUT_FORM)
                                    }
                                    SelectProps={{
                                        native: true,
                                    }}
                                    margin="normal"
                                    variant="outlined"
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
                            <Grid item xs={12} sm={6}>
                                <TextValidator
                                    id="amount-out"
                                    name="outputAmount"
                                    label={labels.inputs.OUTPUT_AMOUNT}
                                    value={inputs.outputAmount}
                                    onChange={e =>
                                        onChange(e, formNames.INPUT_FORM)
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
                            {errorMessage}
                            <Grid item xs={12} sm={6}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    style={{ marginTop: 25 }}
                                >
                                    {buttonText}
                                </Button>
                            </Grid>
                        </Grid>
                    </ValidatorForm>
                </Grid>
            </Grid>
            <Grid container>
                <Grid item>
                    <SwapResults />
                </Grid>
            </Grid>
        </div>
    );
});

export default SwapForm;
