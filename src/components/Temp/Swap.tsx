import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center
	width: 148px;
`

const SwapIcon = styled.img`
	width: 24px;
	height: 24px;
`

const Swap = () => {
	return(
		<Container>
			<SwapIcon src="/swap.svg" />
		</Container>
	)
}

export default Swap