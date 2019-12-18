import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

const BuyToken = ({tokenName, tokenBalance}) => {

	return(
		<TokenPanel headerText="Token to Buy" tokenName={tokenName} tokenBalance={tokenBalance} />
	)
}

export default BuyToken