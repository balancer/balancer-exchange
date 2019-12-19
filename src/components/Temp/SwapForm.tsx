import React from 'react'
import styled from 'styled-components'
import BuyToken from './BuyToken'
import SellToken from './SellToken'


const Container = styled.div`
	font-family: var(--roboto);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-evenly;
`

const SwapForm = ({tokenIn, tokenOut}) => {

	// TODO pass tokenIn and tokenOut

	return(
		<Container>
			<BuyToken tokenName="ETH" tokenBalance="2354.52313" tokenAddress="0x009e864923b49263c7F10D19B7f8Ab7a9A5AAd33" />
			<SellToken tokenName="MKR" tokenBalance="1223.12" tokenAddress="0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2" />
		</Container>
	)
}

export default SwapForm