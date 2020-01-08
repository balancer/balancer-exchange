import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

import { useEffect, useRef } from 'react'
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import { formNames, labels, SwapMethods } from 'stores/SwapForm';
import { checkIsPropertyEmpty, fromWei, toWei } from "utils/helpers";
import { ErrorCodes, ErrorIds } from '../../stores/Error';

const BuyToken = observer( ({inputID, inputName, tokenName, tokenBalance, tokenAddress, setModalOpen}) => {

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

			updateProperty(form, 'type', SwapMethods.EXACT_IN);

      const method = swapFormStore.inputs.type;

      console.log('[Swap Form]', {
          name,
          value,
          inputAmount,
          outputAmount,
          method: swapFormStore.inputs.type
      });

      updateProperty(form, name, value);

      const output = await previewSwapExactAmountInHandler(); // Get preview if all necessary fields are filled out
      // swapFormStore.updateOutputsFromObject(output);
      swapFormStore.updateInputsFromObject(output);
  };

  const previewSwapExactAmountInHandler = async () => {
      const inputs = swapFormStore.inputs;
      const { inputToken, outputToken, inputAmount } = inputs;

      if (!inputAmount || inputAmount === '') {
          return {
              validSwap: false,
          };
      }

      const {
          preview: { outputAmount, effectivePrice, swaps },
          validSwap,
      } = await proxyStore.previewBatchSwapExactIn(
          inputToken,
          outputToken,
          inputAmount
      );

      if (validSwap) {
          return {
              outputAmount: fromWei(outputAmount),
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
  const { inputAmount, setBuyFocus } = inputs;

	return(
		<TokenPanel headerText="Token to Buy" defaultValue={inputAmount} onChange={e => onChange(e, formNames.INPUT_FORM)} inputID={inputID} inputName={inputName} tokenName={tokenName} tokenBalance={tokenBalance} tokenAddress={tokenAddress} setModalOpen={setModalOpen} setFocus={setBuyFocus} />
	)
})

export default BuyToken