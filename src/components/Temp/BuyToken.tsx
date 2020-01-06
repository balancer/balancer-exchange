import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

const BuyToken = ({tokenName, tokenBalance, tokenAddress, setModalOpen}) => {

	return(
		<TokenPanel headerText="Token to Buy" tokenName={tokenName} tokenBalance={tokenBalance} tokenAddress={tokenAddress} setModalOpen={setModalOpen} />
	)
}

export default BuyToken