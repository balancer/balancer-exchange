import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	margin-bottom: 32px;
`

const SlippageInfo = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
	color: var(--header-text);
	font-family: var(--roboto);
	font-size: 14px;
	line-height: 16px;
	display: flex;
	align-items: center;
`

const SlippageInlineDisplay = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 24px;
	border: 1px solid var(--link-text);
	box-sizing: border-box;
	border-radius: 4px;
	margin-left: 10px;
	margin-right: 10px;
	color: var(--link-text);
`

const InfoPopover = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 15px;
	height: 15px;
	border: 1px solid var(--info-border);
	border-radius: 8px;
	margin-left: 10px;
	font-size: 10px;
`

const SelectorDropDown = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
`

const SlippageSelector = ({expectedSlippage}) => {

	return(
		<Container>
			<SlippageInfo>
				<div>Expected price slippage of {expectedSlippage} with</div>
				<SlippageInlineDisplay>0.5%</SlippageInlineDisplay>
				<div>additional limit</div>
				<InfoPopover>i</InfoPopover>
			</SlippageInfo>
			<SelectorDropDown>
			</SelectorDropDown>
		</Container>
	)
}

export default SlippageSelector