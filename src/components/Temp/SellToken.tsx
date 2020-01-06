import React from 'react'
import styled from 'styled-components'
import TokenPanel from './TokenPanel'

const SellToken = ({tokenName, tokenBalance, tokenAddress, setModalOpen}) => {

	return(
		<TokenPanel headerText="Token to Sell" tokenName={tokenName} tokenBalance={tokenBalance} tokenAddress={tokenAddress} setModalOpen={setModalOpen} />
	)
}

export default SellToken