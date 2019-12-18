import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

const SellToken = ({tokenName, tokenBalance}) => {

	return(
		<TokenPanel headerText="Token to Sell" tokenName={tokenName} tokenBalance={tokenBalance} />
	)
}

export default SellToken