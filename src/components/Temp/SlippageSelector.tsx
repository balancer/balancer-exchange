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
	margin-bottom: 28px;
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
	cursor: pointer;
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
	width: 500px;
	height: 38px;
	background: var(--selector-background);
	border-radius: 6px;
	position: relative;
`

const SelectorDropDownCell = styled.div`
	font-family: var(--roboto);
	font-size: 14px;
	line-height: 16px;
	width: 125px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--selector-text);
	border: 1px solid var(--selector-border);
	border-left: none;
	:nth-child(1) {
		border-left: 1px solid var(--selector-border);
		border-radius: 6px 0px 0px 6px;
	}
	:nth-last-child(1) {
		border-radius: 0px 6px 6px 0px;
	}
	z-index: 1;
`

const ActiveSelectorDropDownCell = styled(SelectorDropDownCell)`
	color: var(--highlighted-selector-text);
	border: 1px solid var(--highlighted-selector-border);
	background: var(--highlighted-selector-background);
	margin-left: -1px;
	:nth-child(1) {
		border-left: 1px solid var(--highlighted-selector-border);
	}
`

const Arrow = styled.div`
	width: 12px;
	height: 12px;
	background: #7785D5;
	transform: rotate(45deg);
	position: absolute;
	top: -6px;
	right: 185px;
`

const SlippageSelector = ({expectedSlippage, slippageSelectorOpen, setSlippageSelectorOpen}) => {

	return(
		<Container>
			<SlippageInfo>
				<div>Expected price slippage of {expectedSlippage} with</div>
				<SlippageInlineDisplay  onClick={() => {setSlippageSelectorOpen(true)}}>0.5%</SlippageInlineDisplay>
				<div>additional limit</div>
				<InfoPopover>i</InfoPopover>
			</SlippageInfo>
			<SelectorDropDown style={{display: slippageSelectorOpen ? 'flex' : 'none'}}>
				<SelectorDropDownCell>0.1%</SelectorDropDownCell>
				<SelectorDropDownCell>0.5%</SelectorDropDownCell>
				<ActiveSelectorDropDownCell>1.0%</ActiveSelectorDropDownCell>
				<Arrow />
				<SelectorDropDownCell>Custom %</SelectorDropDownCell>
			</SelectorDropDown>
		</Container>
	)
}

export default SlippageSelector