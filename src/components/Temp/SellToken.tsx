import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import { formNames, InputValidationStatus, SwapMethods } from 'stores/SwapForm';
import { bnum, fromWei, str } from "utils/helpers";
import { ExactAmountInPreview } from "stores/Proxy";

const SellToken = observer(
    ({
        inputID,
        inputName,
        tokenName,
        tokenBalance,
        tokenAddress,
        setModalOpen,
        errorMessage
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

        const updateProperty = (form, key, value) => {
            swapFormStore[form][key] = value;
        };

        const onChange = async (event, form) => {
            const { name, value } = event.target;
            const { inputAmount, outputAmount } = swapFormStore.inputs;

            swapFormStore.inputs.setBuyFocus = false;
            swapFormStore.inputs.setSellFocus = true;

            updateProperty(form, 'type', SwapMethods.EXACT_IN);
            updateProperty(form, name, value);

            const inputStatus = swapFormStore.getSwapFormInputValidationStatus(value);

            if (inputStatus === InputValidationStatus.VALID) {
                const preview = await previewSwapExactAmountInHandler();

                let output = {
                    validSwap: false
                };

                if (preview.validSwap) {
                    output['outputAmount'] = fromWei(preview.totalOutput);
                    output['effectivePrice'] = str(preview.effectivePrice);
                    output['swaps'] = preview.swaps;
                    output['validSwap'] = true;
                    output['activeErrorMessage'] = '';
                    swapFormStore.setTradeCompositionEAI(preview);
                } else {
                    swapFormStore.resetTradeComposition();
                }

                swapFormStore.updateInputsFromObject(output);
                swapFormStore.updateOutputsFromObject(output);
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                swapFormStore.updateInputsFromObject({
                    outputAmount: '',
                    activeErrorMessage: inputStatus,
                    // clear preview
                });
                swapFormStore.resetTradeComposition();
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
                onChange={e => onChange(e, formNames.INPUT_FORM)}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                tokenAddress={tokenAddress}
                setModalOpen={setModalOpen}
                setFocus={setSellFocus}
                errorMessage={errorMessage}
            />
        );
    }
);

export default SellToken;
