import React from 'react'
import { Card, CardContent, Typography } from '@material-ui/core'
import { observer, inject } from 'mobx-react'
import { labels, methodNames } from 'stores/SwapForm'
import * as helpers from 'utils/helpers'
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
    button: {
        display: 'block',
        marginTop: theme.spacing(2)
    },
    formControl: {
        margin: theme.spacing(1),
        paddingLeft: theme.spacing(1),
        minWidth: 120
    }
})

@inject('root')
@observer
class SwapResults extends React.Component {

    buildCardContentByMethod() {
        const { swapFormStore } = this.props.root
        const { swapMethod, outputs } = swapFormStore

        const validSwap = outputs.validSwap
        let inputAmount = helpers.roundValue(outputs.inputAmount)
        let outputAmount = helpers.roundValue(outputs.outputAmount)
        let effectivePrice = helpers.roundValue(outputs.effectivePrice)

        if (!validSwap) {
            inputAmount = '--'
            outputAmount = '--'
            effectivePrice = '--'
        }

        if (swapMethod === methodNames.EXACT_AMOUNT_IN) {
            return (
                <React.Fragment>
                    <Typography variant="body1">{`${labels.outputs.OUTPUT_AMOUNT}: ${outputAmount}`}</Typography>
                    <Typography variant="body1">{`${labels.outputs.EFFECTIVE_PRICE}: ${effectivePrice}`}</Typography>
                </React.Fragment>
            )
        } else if (swapMethod === methodNames.EXACT_AMOUNT_OUT) {
            return (
                <React.Fragment>
                    <Typography variant="body1">{`${labels.outputs.INPUT_AMOUNT}: ${inputAmount}`}</Typography>
                    <Typography variant="body1">{`${labels.outputs.EFFECTIVE_PRICE}: ${effectivePrice}`}</Typography>
                </React.Fragment>
            )
        } else if (swapMethod === methodNames.EXACT_MARGINAL_PRICE) {
            return (
                <React.Fragment>
                    <Typography variant="body1">{`${labels.outputs.INPUT_AMOUNT}: ${inputAmount}`}</Typography>
                    <Typography variant="body1">{`${labels.outputs.OUTPUT_AMOUNT}: ${outputAmount}`}</Typography>
                </React.Fragment>
            )
        }
    }

    render() {
        const { swapFormStore } = this.props.root
        const { outputs } = swapFormStore

        const validSwap = outputs.validSwap

        return (
            <Card>
                <CardContent>
                    <Typography variant="h5">Result Preview</Typography>
                    {this.buildCardContentByMethod()}
                    {
                        validSwap ?
                            <React.Fragment><br /><br /></React.Fragment>
                            :
                            <React.Fragment>
                                <br />
                                <Typography color="textSecondary" variant="body1">(Invalid Swap Parameters)</Typography>
                            </React.Fragment>
                    }
                </CardContent>

            </Card>
        )
    }
}

export default withStyles(styles)(SwapResults)