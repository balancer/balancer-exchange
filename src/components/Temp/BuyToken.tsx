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
import { ExactAmountOutPreview } from '../../stores/Proxy';
import { useActiveWeb3React } from '../../provider';

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
            root: { proxyStore, swapFormStore, providerStore, poolStore },
        } = useStores();

        const web3React = useActiveWeb3React();

        const onChange = async event => {
            const { value } = event.target;
            updateSwapFormData(value);
        };

        /* To protect against race conditions in this async method we check
        for staleness of inputAmount after getting preview and before making updates */
        const updateSwapFormData = async value => {
            swapFormStore.setInputFocus(InputFocus.BUY);
            swapFormStore.inputs.type = SwapMethods.EXACT_OUT;
            swapFormStore.inputs.outputAmount = value;

            let inputStatus = swapFormStore.getNumberInputValidationStatus(
                value
            );

            if (inputStatus === InputValidationStatus.VALID) {
                if (parseFloat(value) > parseFloat(tokenBalance)) {
                    inputStatus = InputValidationStatus.INSUFFICIENT_BALANCE;
                }
            }

            if (inputStatus === InputValidationStatus.VALID) {
                const preview = await previewSwapExactAmountOutHandler();

                if (swapFormStore.isOutputAmountStale(preview.outputAmount)) {
                    if (preview.validSwap) {
                        swapFormStore.setOutputFromPreview(
                            SwapMethods.EXACT_OUT,
                            preview
                        );
                        swapFormStore.clearErrorMessage();
                        swapFormStore.setTradeCompositionEAO(preview);
                    } else {
                        swapFormStore.setValidSwap(false);
                        swapFormStore.resetTradeComposition();
                    }
                }
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                if (value == swapFormStore.inputs.outputAmount) {
                    // Don't show error message on empty value
                    if (inputStatus === InputValidationStatus.EMPTY) {
                        swapFormStore.setInputAmount('');

                        swapFormStore.clearErrorMessage();
                        swapFormStore.resetTradeComposition();
                    } else {
                        //Show error message on other invalid input status
                        swapFormStore.setInputAmount('');
                        swapFormStore.setErrorMessage(inputStatus);
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
