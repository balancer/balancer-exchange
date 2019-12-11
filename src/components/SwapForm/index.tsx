import React from 'react';
import { Grid, TextField, Button } from '@material-ui/core';
import { observer, inject } from 'mobx-react';
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator';
import * as helpers from 'utils/helpers';
import { labels, formNames } from 'stores/SwapForm';
import SwapResults from './SwapResults';
import { validators } from '../validators';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
    formControl: {
        margin: theme.spacing(1),
    },
});

@inject('root')
@observer
class SwapForm extends React.Component<any, any> {
    updateProperty(form, key, value) {
        this.props.root.swapFormStore[form][key] = value;
    }

    onChange = async (event, form) => {
        const { swapFormStore } = this.props.root;
        this.updateProperty(form, event.target.name, event.target.value);
        const { inputAmount, outputAmount } = swapFormStore.inputs;

        // Get preview if all necessary fields are filled out
        if (
            event.target.name === 'inputAmount' &&
            !helpers.checkIsPropertyEmpty(inputAmount)
        ) {
            this.updateProperty(form, 'type', 'exactIn');
            const output = await this.previewSwapExactAmountInHandler();
            swapFormStore.updateOutputsFromObject(output);
        } else if (
            event.target.name === 'outputAmount' &&
            !helpers.checkIsPropertyEmpty(outputAmount)
        ) {
            this.updateProperty(form, 'type', 'exactOut');
            const output = await this.previewSwapExactAmountOutHandler();
            swapFormStore.updateOutputsFromObject(output);
        }
    };

    swapHandler = async () => {
        const { proxyStore, swapFormStore } = this.props.root;

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

    previewSwapExactAmountInHandler = async () => {
        const { proxyStore, swapFormStore } = this.props.root;

        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, inputAmount } = inputs;

        const call = await proxyStore.previewBatchSwapExactIn(
            inputToken,
            outputToken,
            inputAmount
        );

        if (call.validSwap) {
            return {
                outputAmount: helpers.fromWei(call.outputAmount),
                effectivePrice: call.effectivePrice,
                swaps: call.swaps,
                validSwap: call.validSwap,
            };
        } else {
            return {
                validSwap: call.validSwap,
            };
        }
    };

    previewSwapExactAmountOutHandler = async () => {
        const { proxyStore, swapFormStore } = this.props.root;

        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, outputAmount } = inputs;

        const call = await proxyStore.previewBatchSwapExactOut(
            inputToken,
            outputToken,
            outputAmount
        );

        if (call.validSwap) {
            return {
                inputAmount: helpers.fromWei(call.inputAmount),
                effectivePrice: call.effectivePrice,
                swaps: call.swaps,
                validSwap: call.validSwap,
            };
        } else {
            return {
                validSwap: call.validSwap,
            };
        }
    };

    render() {
        const { swapFormStore } = this.props.root;
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
                            ref="form"
                            onSubmit={() => {
                                this.swapHandler();
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
                                            this.onChange(
                                                e,
                                                formNames.INPUT_FORM
                                            )
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
                                            this.onChange(
                                                e,
                                                formNames.INPUT_FORM
                                            )
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
                                            this.onChange(
                                                e,
                                                formNames.INPUT_FORM
                                            )
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
                                            this.onChange(
                                                e,
                                                formNames.INPUT_FORM
                                            )
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
    }
}

export default withStyles(styles)(SwapForm);
