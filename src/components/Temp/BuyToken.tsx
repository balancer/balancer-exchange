import React from "react";
import TokenPanel from "./TokenPanel";
import { observer } from "mobx-react";
import { useStores } from "../../contexts/storesContext";
import { formNames, InputValidationStatus, SwapMethods } from "stores/SwapForm";
import { bnum, fromWei, str } from "utils/helpers";
import { ExactAmountOutPreview } from "../../stores/Proxy";

const BuyToken = observer(
  ({
    inputID,
    inputName,
    tokenName,
    tokenBalance,
    tokenAddress,
    setModalOpen
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

        swapFormStore.inputs.setSellFocus = false;
        swapFormStore.inputs.setBuyFocus = true;

  			updateProperty(form, 'type', SwapMethods.EXACT_OUT);

        console.log('[Swap Form]', {
            name,
            value,
            inputAmount,
            outputAmount,
            method: swapFormStore.inputs.type
        });

        updateProperty(form, name, value);

        const inputStatus = swapFormStore.getSwapFormInputValidationStatus(value);

        if (inputStatus === InputValidationStatus.VALID) {
            const preview = await previewSwapExactAmountOutHandler();

            let output = {
                validSwap: false
            };

            if (preview.validSwap) {
                output['inputAmount'] = fromWei(preview.totalInput);
                output['effectivePrice'] = str(preview.effectivePrice);
                output['swaps'] = preview.swaps;
                output['validSwap'] = true;
            }

            swapFormStore.updateInputsFromObject(output);
            swapFormStore.updateOutputsFromObject(output);
            swapFormStore.setTradeCompositionEAO(preview);
        } else {
            console.log('[Invalid Input]', inputStatus, value);
            swapFormStore.updateInputsFromObject({
                inputAmount: ''
                // clear preview
            })
        }
    };

    const previewSwapExactAmountOutHandler = async (): Promise<ExactAmountOutPreview> => {
        const inputs = swapFormStore.inputs;
        const { inputToken, outputToken, outputAmount } = inputs;

        if (!outputAmount || outputAmount === '') {
            return {
                totalInput: null,
                effectivePrice: null,
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

  	return(
  		<TokenPanel
        headerText="Token to Buy"
        defaultValue={outputAmount}
        onChange={e => onChange(e, formNames.INPUT_FORM)}
        inputID={inputID} 
        inputName={inputName}
        tokenName={tokenName}
        tokenBalance={tokenBalance}
        tokenAddress={tokenAddress}
        setModalOpen={setModalOpen}
        setFocus={setBuyFocus}
       />
  	);
  }
);

export default BuyToken