// @ts-nocheck
import React, { useRef } from 'react';
import { Grid, TextField, Button } from '@material-ui/core';
import { observer } from 'mobx-react';
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator';
import * as helpers from 'utils/helpers';
import { labels, formNames } from 'stores/SwapForm';
import SwapResults from './SwapResults';
import { validators } from '../validators';
import { useStores } from '../../contexts/storesContext';

const SwapForm = observer(props => {
    const {
        root: { proxyStore, swapFormStore },
    } = useStores();

    const updateProperty = (form, key, value) => {
        swapFormStore[form][key] = value;
    };

    const onChange = async (event, form) => {
        console.log({
            name: event.target.name,
            value: event.target.value,
        });
        updateProperty(form, event.target.name, event.target.value);
        const { inputAmount, outputAmount } = swapFormStore.inputs;

        // Get preview if all necessary fields are filled out
        if (
            event.target.name === 'inputAmount' &&
            !helpers.checkIsPropertyEmpty(inputAmount)
        ) {
            updateProperty(form, 'type', 'exactIn');
            const output = await previewSwapExactAmountInHandler();
            swapFormStore.updateOutputsFromObject(output);
        } else if (
            event.target.name === 'outputAmount' &&
            !helpers.checkIsPropertyEmpty(outputAmount)
        ) {
            updateProperty(form, 'type', 'exactOut');
            const output = await previewSwapExactAmountOutHandler();
            swapFormStore.updateOutputsFromObject(output);
        }
    };

    const swapHandler = async () => {
        const inputs = swapFormStore.inputs;

        if (inputs.type === 'exactIn') {
            const {
                inputAmount,
                inputToken,
                outputToken,
                outputLimit,
                limitPrice,
            } = inputs;
            await proxyStore.batchSwapExactIn(
                inputToken,
                inputAmount,
                outputToken,
                helpers.toWei(outputLimit),
                helpers.toWei(limitPrice)
            );
        } else if (inputs.type === 'exactOut') {
            const {
                inputLimit,
                inputToken,
                outputToken,
                outputAmount,
                limitPrice,
            } = inputs;
            await proxyStore.batchSwapExactOut(
                inputToken,
                helpers.toWei(inputLimit),
                outputToken,
                outputAmount,
                helpers.toWei(limitPrice)
            );
        }
    };

    const previewSwapExactAmountInHandler = async () => {
        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, inputAmount } = inputs;

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
                outputAmount: helpers.fromWei(outputAmount),
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
                inputAmount: helpers.fromWei(inputAmount),
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

    const { inputs } = swapFormStore;
    const tokenList = swapFormStore.getTokenList();

    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
        swapFormStore.inputs.inputToken = tokenList[0].address;
    }

    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
        swapFormStore.inputs.outputToken = tokenList[1].address;
    }

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
                            <Grid item xs={12} sm={6}>
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
            <Grid container>
                <Grid item>
                    <SwapResults />
                </Grid>
            </Grid>
        </div>
    );
});

export default SwapForm;
