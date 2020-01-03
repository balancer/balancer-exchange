import React from 'react'
import styled from 'styled-components'
import BuyToken from './BuyToken'
import SellToken from './SellToken'
import Swap from './Swap'
import Button from './Button'
import SlippageSelector from './SlippageSelector'
import TradeComposition from './TradeComposition'
import AssetSelector from './AssetSelector'

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

const SwapForm = ({tokenIn, tokenOut}) => {

	const [modelOpen, setModalOpen] = React.useState(false)

	// TODO pass tokenIn and tokenOut
	return(
		<div>
			<AssetSelector modelOpen={modelOpen} setModalOpen={setModalOpen} />
			<RowContainer>
				<BuyToken setModalOpen={setModalOpen} tokenName="ETH" tokenBalance="2354.52313" tokenAddress="0x009e864923b49263c7F10D19B7f8Ab7a9A5AAd33" />
				<Swap />
				<SellToken setModalOpen={setModalOpen} tokenName="MKR" tokenBalance="1223.12" tokenAddress="0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2" />
			</RowContainer>
			<ColumnContainer>
				<TradeComposition />
				<SlippageSelector expectedSlippage="0.38%" />
				<Button buttonText="Swap" active={true} />
			</ColumnContainer>
		</div>
	)
}

export default SwapForm