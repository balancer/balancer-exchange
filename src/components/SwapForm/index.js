import React from 'react'
import { Grid, TextField, Button } from '@material-ui/core'
import { observer, inject } from 'mobx-react'
import { ValidatorForm, TextValidator } from 'react-material-ui-form-validator'
import * as helpers from 'utils/helpers'
import { labels, formNames } from 'stores/SwapForm'
import SwapResults from './SwapResults'
import { validators } from '../validators'
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
    formControl: {
        margin: theme.spacing(1)
    }
})

@inject('root')
@observer
class SwapForm extends React.Component {
    updateProperty(form, key, value) {
        this.props.root.swapFormStore[form][key] = value
    }

    onChange = async (event, form) => {
        const { swapFormStore } = this.props.root
        this.updateProperty(form, event.target.name, event.target.value)
        const { inputAmount, inputToken, outputToken } = swapFormStore.inputs

        // Get preview if all necessary fields are filled out
        if (
            !helpers.checkIsPropertyEmpty(inputAmount) &&
            !helpers.checkIsPropertyEmpty(inputToken) &&
            !helpers.checkIsPropertyEmpty(outputToken)
        ) {
            const output = await this.previewSwapExactAmountInHandler()
            swapFormStore.updateOutputsFromObject(output)
        }

        // The view fails to update if this becomes empty?
        if (helpers.checkIsPropertyEmpty(inputAmount)) {
            swapFormStore.updateOutputsFromObject({
                validSwap: false
            })
        }
    }

    getSanitizedInputValues() {
        const { swapFormStore } = this.props.root
        const inputs = swapFormStore.inputs

        const { inputAmount, inputToken, outputToken } = inputs
        let outputLimit = inputs['outputLimit']
        let limitPrice = inputs['limitPrice']

        // Empty limit price = no price limit
        limitPrice = helpers.setPropertyToMaxUintIfEmpty(limitPrice)
        // Empty output limit = no minimum
        outputLimit = helpers.setPropertyToZeroIfEmpty(outputLimit)

        return {
            inputAmount,
            inputToken,
            outputToken,
            outputLimit,
            limitPrice,
        }
    }

    swapExactAmountInHandler = async () => {
        const { proxyStore } = this.props.root

        const inputs = this.getSanitizedInputValues()
        const { inputAmount, inputToken, outputToken, outputLimit, limitPrice } = inputs

        await proxyStore.batchSwapExactIn(
            inputToken,
            helpers.toWei(inputAmount),
            outputToken,
            helpers.toWei(outputLimit),
            helpers.toWei(limitPrice)
        )
    }

    previewSwapExactAmountInHandler = async () => {
        const { proxyStore } = this.props.root

        const inputs = this.getSanitizedInputValues()
        const { inputAmount, inputToken, outputToken, outputLimit, limitPrice } = inputs

        const call = await proxyStore.previewBatchSwapExactIn(
            inputToken,
            helpers.toWei(inputAmount),
            outputToken,
            helpers.toWei(outputLimit),
            helpers.toWei(limitPrice)
        )

        if (call.validSwap) {
            return {
                outputAmount: helpers.fromWei(call.outputAmount),
                effectivePrice: call.effectivePrice,
                validSwap: call.validSwap
            }
        } else {
            return {
                validSwap: call.validSwap
            }
        }
    }

    render() {
        const { swapFormStore } = this.props.root
        const { inputs } = swapFormStore

        // const pool = poolStore.getPool(poolAddress)
        const tokenList = swapFormStore.getTokenList()
        // const tokens = utilStore.generateTokenDropdownData(tokenList)

        if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
            swapFormStore.inputs.inputToken = tokenList[0].address
        }

        if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
            swapFormStore.inputs.outputToken = tokenList[1].address
        }

        return (
            <div>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={12}>
                        <ValidatorForm
                            ref="form"
                            onSubmit={() => { this.swapExactAmountInHandler() }}
                            onError={errors => console.log(errors)}>
                            <Grid container spacing={1}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        id="token-in"
                                        name="inputToken"
                                        select
                                        label={labels.inputs.INPUT_TOKEN}
                                        value={inputs.inputToken}
                                        onChange={e => this.onChange(e, formNames.INPUT_FORM)}
                                        SelectProps={{
                                            native: true
                                        }}
                                        margin="normal"
                                        variant="outlined"
                                        fullWidth
                                    >
                                    {tokenList.map(option => (
                                            <option key={option.address} value={option.address}>
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
                                        onChange={e => this.onChange(e, formNames.INPUT_FORM)}
                                        type="number"
                                        InputLabelProps={{
                                            shrink: true
                                        }}
                                        margin="normal"
                                        variant="outlined"
                                        fullWidth
                                        validators={validators.requiredTokenValueValidators}
                                        errorMessages={validators.requiredTokenValueValidatorErrors}
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
                                        onChange={e => this.onChange(e, formNames.INPUT_FORM)}
                                        SelectProps={{
                                            native: true
                                        }}
                                        margin="normal"
                                        variant="outlined"
                                    >
                                    {tokenList.map(option => (
                                            <option key={option.address} value={option.address}>
                                                {option.symbol}
                                            </option>
                                    ))}
                                    </TextField>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextValidator
                                        id="limit-out"
                                        name="outputLimit"
                                        label={labels.inputs.OUTPUT_LIMIT}
                                        value={inputs.outputLimit}
                                        onChange={e => this.onChange(e, formNames.INPUT_FORM)}
                                        type="number"
                                        InputLabelProps={{
                                            shrink: true
                                        }}
                                        margin="normal"
                                        variant="outlined"
                                        fullWidth
                                        validators={validators.optionalTokenValueValidators}
                                        errorMessages={validators.optionalTokenValueValidatorErrors}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextValidator
                                        id="limit-price"
                                        name="limitPrice"
                                        label={labels.inputs.LIMIT_PRICE}
                                        value={inputs.limitPrice}
                                        onChange={e => this.onChange(e, formNames.INPUT_FORM)}
                                        type="number"
                                        InputLabelProps={{
                                            shrink: true
                                        }}
                                        margin="normal"
                                        variant="outlined"
                                        fullWidth
                                        validators={validators.optionalTokenValueValidators}
                                        errorMessages={validators.optionalTokenValueValidatorErrors}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        style={{ marginTop: 25 }}>
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

        )
    }
}

export default withStyles(styles)(SwapForm)
