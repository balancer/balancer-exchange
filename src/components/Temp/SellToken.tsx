import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import {
    InputFocus,
    InputValidationStatus,
    SwapMethods,
} from 'stores/SwapForm';
import { bnum } from 'utils/helpers';
import { ExactAmountInPreview } from 'stores/Proxy';
import { useActiveWeb3React } from 'provider';

const SellToken = observer(
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
            root: { proxyStore, swapFormStore },
        } = useStores();

        const web3React = useActiveWeb3React();

        const onChange = async event => {
            const { value } = event.target;
            updateSwapFormData(value);
        };

        /* To protect against race conditions in this async method we check
        for staleness of inputAmount after getting preview and before making updates */
        const updateSwapFormData = async value => {
            swapFormStore.setInputFocus(InputFocus.SELL);
            swapFormStore.inputs.type = SwapMethods.EXACT_IN;
            swapFormStore.inputs.inputAmount = value;

            let inputStatus = swapFormStore.getNumberInputValidationStatus(
                value
            );

            if (inputStatus === InputValidationStatus.VALID) {
                if (parseFloat(value) > parseFloat(tokenBalance)) {
                    inputStatus = InputValidationStatus.INSUFFICIENT_BALANCE;
                }
            }

            if (inputStatus === InputValidationStatus.VALID) {
                const preview = await previewSwapExactAmountInHandler();

                if (preview.error) {
                    swapFormStore.setErrorMessage(preview.error);
                }

                if (swapFormStore.isInputAmountStale(preview.inputAmount)) {
                    if (preview.validSwap) {
                        swapFormStore.setOutputFromPreview(
                            SwapMethods.EXACT_IN,
                            preview
                        );
                        swapFormStore.clearErrorMessage();
                        swapFormStore.setTradeCompositionEAI(preview);
                    } else {
                        swapFormStore.setValidSwap(false);
                        swapFormStore.resetTradeComposition();
                    }
                }
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                if (value == swapFormStore.inputs.inputAmount) {
                    // Clear error messages on updating to empty input
                    if (inputStatus === InputValidationStatus.EMPTY) {
                        swapFormStore.updateInputsFromObject({
                            outputAmount: '',
                        });
                        swapFormStore.clearErrorMessage();
                        swapFormStore.resetTradeComposition();
                    } else {
                        swapFormStore.updateInputsFromObject({
                            outputAmount: '',
                        });
                        swapFormStore.setErrorMessage(inputStatus);
                        swapFormStore.resetTradeComposition();
                    }
                }
            }
        };

        const previewSwapExactAmountInHandler = async (): Promise<ExactAmountInPreview> => {
            const inputs = swapFormStore.inputs;
            const { inputToken, outputToken, inputAmount } = inputs;

            if (!inputAmount || inputAmount === '') {
                return {
                    inputAmount: bnum(inputAmount),
                    totalOutput: null,
                    effectivePrice: null,
                    spotPrice: null,
                    swaps: null,
                    validSwap: false,
                };
            }

            return await proxyStore.previewBatchSwapExactIn(
                inputToken,
                outputToken,
                bnum(inputAmount)
            );
        };

        const { inputs, outputs } = swapFormStore;
        const { inputAmount, setSellFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Sell"
                defaultValue={inputAmount}
                onChange={e => onChange(e)}
                updateSwapFormData={updateSwapFormData}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                truncatedTokenBalance={truncatedTokenBalance}
                tokenAddress={tokenAddress}
                setModalOpen={setModalOpen}
                setFocus={setSellFocus}
                errorMessage={errorMessage}
                showMax={showMax}
            />
        );
    }
);

export default SellToken;
