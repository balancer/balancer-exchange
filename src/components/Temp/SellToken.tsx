import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import { formNames, InputValidationStatus, labels, SwapMethods } from "stores/SwapForm";
import { checkIsPropertyEmpty, fromWei, toWei } from "utils/helpers";
import { ErrorCodes, ErrorIds } from '../../stores/Error';

const SellToken = observer( ({inputID, inputName, tokenName, tokenBalance, tokenAddress, setModalOpen}) => {

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
    let validInput = false;

    if (inputStatus === InputValidationStatus.NEGATIVE) {
      console.log('[Buy Token]', 'Input must be positive');
    }

    if (inputStatus === InputValidationStatus.NOT_FLOAT) {
      console.log('[Buy Token]', 'Input must be number');
    }

    if (inputStatus === InputValidationStatus.ZERO) {
      console.log('[Buy Token]', 'Input must be non-zero');
    }

    if (inputStatus === InputValidationStatus.EMPTY) {
      console.log('[Buy Token]', 'Empty input, valid but clear opposite input');
    }

    if (inputStatus === InputValidationStatus.VALID) {
      validInput = true;
    }

    if (validInput) {
      const output = await previewSwapExactAmountOutHandler(); // Get preview if all necessary fields are filled out
      swapFormStore.updateOutputsFromObject(output);
      swapFormStore.updateInputsFromObject(output);
    } else {
      swapFormStore.updateInputsFromObject({
        inputAmount: ''
        // clear preview
      })
    }


  };

  const previewSwapExactAmountOutHandler = async () => {
    const inputs = swapFormStore.inputs;
    const { inputToken, outputToken, outputAmount, type } = inputs;

    if (!outputAmount || outputAmount === '') {
        return {
            validSwap: false,
        };
    }

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
            inputAmount: fromWei(inputAmount),
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

  const { inputs, outputs } = swapFormStore;
  const { outputAmount, setSellFocus } = inputs;

	return(
		<TokenPanel headerText="Token to Sell" defaultValue={outputAmount} onChange={e => onChange(e, formNames.INPUT_FORM)} inputID={inputID} inputName={inputName} tokenName={tokenName} tokenBalance={tokenBalance} tokenAddress={tokenAddress} setModalOpen={setModalOpen} setFocus={setSellFocus} />
	)
})

export default SellToken