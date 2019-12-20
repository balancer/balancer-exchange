import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@material-ui/core";
import { labels, SwapMethods } from "stores/SwapForm";
import * as helpers from "utils/helpers";
import { useStores } from "../../contexts/storesContext";
import { observer } from "mobx-react";

const SwapResults = observer(props => {
    const {
        root: { proxyStore, swapFormStore },
    } = useStores();

    function buildCardContentByMethod() {
        const { inputs, outputs } = swapFormStore;

        const validSwap = outputs.validSwap;
        let effectivePrice = helpers.roundValue(outputs.effectivePrice);
        let outputAmount = helpers.roundValue(outputs.outputAmount);
        let inputAmount = helpers.roundValue(outputs.inputAmount);

        console.log({validSwap});

        if (!validSwap) {
            effectivePrice = '--';
            outputAmount = '--';
            inputAmount = '--';
        }

        if (inputs.type === SwapMethods.EXACT_IN) {
            return (
              <React.Fragment>
                  <Typography variant="body1">{`${labels.outputs.EFFECTIVE_PRICE}: ${effectivePrice}`}</Typography>
                  <Typography variant="body1">{`${labels.outputs.OUTPUT_AMOUNT}: ${outputAmount}`}</Typography>
              </React.Fragment>
            );
        }

        if (inputs.type === SwapMethods.EXACT_OUT) {
            return (
              <React.Fragment>
                  <Typography variant="body1">{`${labels.outputs.EFFECTIVE_PRICE}: ${effectivePrice}`}</Typography>
                  <Typography variant="body1">{`${labels.outputs.INPUT_AMOUNT}: ${inputAmount}`}</Typography>
              </React.Fragment>
            );
        }

    }

    function buildTable() {
        const { outputs } = swapFormStore;
        const validSwap = outputs.validSwap;

        console.log({
          method: 'buildTable()',
          validSwap,
          outputSwaps: outputs.swaps
        });

        if (validSwap) {
            return (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Pool</TableCell>
                            <TableCell>Amount</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {outputs.swaps.slice().map(row => {
                            return (
                                <TableRow hover tabIndex={-1} key={row[0]}>
                                    <TableCell key={`${row[0]}`}>
                                        <Link
                                            href={`/${row[0]}`}
                                            to={`/${row[0]}`}
                                        >
                                            {row[0]}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {swapFormStore.inputs.type === SwapMethods.EXACT_IN
                                            ? helpers.fromWei(row[1])
                                            : helpers.fromWei(row[2])}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            );
        }
    }

    const { outputs } = swapFormStore;
    const validSwap = outputs.validSwap;

    return (
        <Card>
            <CardContent>
                <Typography variant="h5">Result Preview</Typography>
                {buildCardContentByMethod()}
                {validSwap ? (
                    <React.Fragment>
                        <br />
                        <br />
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <br />
                        <Typography color="textSecondary" variant="body1">
                            (Invalid Swap Parameters)
                        </Typography>
                    </React.Fragment>
                )}
                {buildTable()}
            </CardContent>
        </Card>
    );
});

export default SwapResults;
