import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

const BuyToken = ({tokenName, tokenBalance, tokenAddress}) => {

	return(
		<TokenPanel headerText="Token to Buy" tokenName={tokenName} tokenBalance={tokenBalance} tokenAddress={tokenAddress} />
	)
}

export default BuyToken