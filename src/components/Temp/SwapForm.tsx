import React from 'react'
import styled from 'styled-components'
import BuyToken from './BuyToken'
import SellToken from './SellToken'
import Swap from './Swap'
import Button from './Button'
import SlippageSelector from './SlippageSelector'
import TradeComposition from './TradeComposition'
import AssetSelector from './AssetSelector'




import { observer } from 'mobx-react';
import * as helpers from 'utils/helpers';
import { formNames, labels, SwapMethods } from 'stores/SwapForm';
import { validators } from '../validators';
import { useStores } from '../../contexts/storesContext';
import { ErrorCodes, ErrorIds } from '../../stores/Error';
import { bigNumberify } from 'ethers/utils';
import { ContractMetadata } from "../../stores/Token";
import { checkIsPropertyEmpty, fromWei, toWei } from "utils/helpers";




const RowContainer = styled.div`
	font-family: var(--roboto);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
`

const ColumnContainer = styled.div`
	font-family: var(--roboto);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
`

const SwapForm = observer( ({tokenIn, tokenOut}) => {

	const [modelOpen, setModalOpen] = React.useState({ state: false, input: "inputAmount"})
	const [tradeCompositionOpen, setTradeCompositionOpen] = React.useState(false)
	const [slippageSelectorOpen, setSlippageSelectorOpen] = React.useState(false)

  const {
      root: {
          proxyStore,
          swapFormStore,
          providerStore,
          tokenStore,
          errorStore,
      },
  } = useStores();

  const { chainId, account } = providerStore.getActiveWeb3React();
  const proxyAddress = tokenStore.getProxyAddress(chainId);

  if (!chainId) {
  		// Review error message
      throw new Error('ChainId not loaded in TestPanel');
  }

  const { inputs } = swapFormStore;
  const { inputToken, inputTicker, inputIconAddress, outputToken, outputTicker, outputIconAddress } = inputs;
  const tokenList = tokenStore.getWhitelistedTokenMetadata(chainId);

  // TODO set default inputToken and outputToken to ETH and DAI (or was it token with highest user balance??)
  if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
      swapFormStore.inputs.inputToken = tokenList[0].address;
      swapFormStore.inputs.inputTicker = tokenList[0].symbol;
      swapFormStore.inputs.inputIconAddress = tokenList[0].iconAddress;
  }

  if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
      swapFormStore.inputs.outputToken = tokenList[1].address;
      swapFormStore.inputs.outputTicker = tokenList[1].symbol;
      swapFormStore.inputs.outputIconAddress = tokenList[1].iconAddress;
  }

  const buttonText = account ? 'Swap' : 'Connect to a wallet';

  let inputUserBalanceBN;
  let inputUserBalance;
  let outputUserBalanceBN;
  let outputUserBalance;
  let userAllowance;
  // TODO set and display user output Balance?

  if (account) {
    inputUserBalanceBN = tokenStore.getBalance(chainId, inputToken, account)
    inputUserBalance  = inputUserBalanceBN ? helpers.fromWei(inputUserBalanceBN).toString() : "N/A"

    outputUserBalanceBN = tokenStore.getBalance(chainId, outputToken, account)
    outputUserBalance  = outputUserBalanceBN ? helpers.fromWei(outputUserBalanceBN).toString() : "N/A"

    userAllowance = tokenStore.getAllowance(
        chainId,
        inputToken,
        account,
        proxyAddress
    );
  }

  const error = errorStore.getActiveError(ErrorIds.SWAP_FORM_STORE);
  let errorMessage;

  if (error) {
      console.log('error', error);
  }

	return(
		<div>
			<AssetSelector modelOpen={modelOpen} setModalOpen={setModalOpen} />
			<RowContainer>
				<BuyToken key="123" inputID="amount-in" inputName="inputAmount" setModalOpen={setModalOpen} tokenName={inputTicker} tokenBalance={inputUserBalance} tokenAddress={inputIconAddress} />
				<Swap />
				<SellToken key="122" inputID="amount-out" inputName="outputAmount" setModalOpen={setModalOpen} tokenName={outputTicker} tokenBalance={outputUserBalance} tokenAddress={outputIconAddress} />
			</RowContainer>
			<ColumnContainer>
				<TradeComposition tradeCompositionOpen={tradeCompositionOpen} setTradeCompositionOpen={setTradeCompositionOpen} />
				<SlippageSelector expectedSlippage="0.38%" slippageSelectorOpen={slippageSelectorOpen} setSlippageSelectorOpen={setSlippageSelectorOpen} />
				<Button buttonText={buttonText} active={true} />
			</ColumnContainer>
		</div>
	)
})

export default SwapForm