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
			<BuyToken tokenName="ETH" tokenBalance="2354.52313" />
			<SellToken tokenName="MKR" tokenBalance="1223.12" />
		</Container>
	)
}

export default SwapForm