import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import { InputValidationStatus, SwapMethods } from 'stores/SwapForm';
import { bnum, formatPctString, fromWei, str } from 'utils/helpers';
import { ExactAmountOutPreview } from '../../stores/Proxy';
import { calcExpectedSlippage } from '../../utils/sorWrapper';

const BuyToken = observer(
    ({
        inputID,
        inputName,
        tokenName,
        tokenBalance,
        truncatedTokenBalance,
        tokenAddress,
        setModalOpen,
        errorMessage,
        showMax,
    }) => {
        const {
            root: {
                proxyStore,
                swapFormStore,
                providerStore,
                tokenStore,
                errorStore,
            },
        } = useStores();

        const onChange = async event => {
            const { value } = event.target;
            updateSwapFormData(value);
        };

        /* To protect against race conditions in this async method we check
        for staleness of inputAmount after getting preview and before making updates */
        const updateSwapFormData = async value => {
            swapFormStore.inputs.setSellFocus = false;
            swapFormStore.inputs.setBuyFocus = true;
            swapFormStore.inputs.type = SwapMethods.EXACT_OUT;
            swapFormStore.inputs.outputAmount = value;

            let inputStatus = swapFormStore.getSwapFormInputValidationStatus(
                value
            );

            if (inputStatus === InputValidationStatus.VALID) {
                if (parseFloat(value) > parseFloat(tokenBalance)) {
                    inputStatus = InputValidationStatus.INSUFFICIENT_BALANCE;
                }
            }

            if (inputStatus === InputValidationStatus.VALID) {
                const preview = await previewSwapExactAmountOutHandler();

                let output = {
                    validSwap: false,
                };

                if (
                    preview.outputAmount.toString() ==
                    swapFormStore.inputs.outputAmount
                ) {
                    if (preview.validSwap) {
                        output['inputAmount'] = fromWei(preview.totalInput);
                        output['effectivePrice'] = str(preview.effectivePrice);
                        output['spotPrice'] = str(preview.spotPrice);
                        output['expectedSlippage'] = formatPctString(
                            calcExpectedSlippage(
                                preview.spotPrice,
                                preview.effectivePrice
                            )
                        );
                        output['swaps'] = preview.swaps;
                        output['validSwap'] = true;
                        output['activeErrorMessage'] = '';
                        swapFormStore.setTradeCompositionEAO(preview);
                    } else {
                        swapFormStore.resetTradeComposition();
                    }

                    swapFormStore.updateInputsFromObject(output);
                    swapFormStore.updateOutputsFromObject(output);
                }
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                if (value == swapFormStore.inputs.outputAmount) {
                    if (inputStatus === InputValidationStatus.EMPTY) {
                        swapFormStore.updateInputsFromObject({
                            inputAmount: '',
                            activeErrorMessage: '',
                            // clear preview
                        });
                        swapFormStore.resetTradeComposition();
                    } else {
                        swapFormStore.updateInputsFromObject({
                            inputAmount: '',
                            activeErrorMessage: inputStatus,
                            // clear preview
                        });
                        swapFormStore.resetTradeComposition();
                    }
                }
            }
        };

        const previewSwapExactAmountOutHandler = async (): Promise<ExactAmountOutPreview> => {
            const inputs = swapFormStore.inputs;
            const { inputToken, outputToken, outputAmount } = inputs;

            if (!outputAmount || outputAmount === '') {
                return {
                    outputAmount: bnum(outputAmount),
                    totalInput: null,
                    effectivePrice: null,
                    spotPrice: null,
                    swaps: null,
                    validSwap: false,
                };
            }

            return await proxyStore.previewBatchSwapExactOut(
                inputToken,
                outputToken,
                bnum(outputAmount)
            );
        };

        const { inputs } = swapFormStore;
        const { outputAmount, setBuyFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Buy"
                defaultValue={outputAmount}
                onChange={e => onChange(e)}
                updateSwapFormData={updateSwapFormData}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                truncatedTokenBalance={truncatedTokenBalance}
                tokenAddress={tokenAddress}
                setModalOpen={setModalOpen}
                setFocus={setBuyFocus}
                errorMessage={errorMessage}
                showMax={showMax}
            />
        );
    }
);

export default BuyToken;
