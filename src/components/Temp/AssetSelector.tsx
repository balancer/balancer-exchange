import React from 'react'
import styled from 'styled-components'
import { TokenIconAddress } from './TokenPanel'
import { useStores } from "../../contexts/storesContext";
import { BigNumber } from 'ethers/utils';

const Container = styled.div`
  display: block;
  position: fixed;
  z-index: 5;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0);
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
`

const ModalContent = styled.div`
	margin: 15% auto;
	display: flex;
	flex-direction: column;
	max-width: 554px;
	max-height: 449px;
	background-color: var(--panel-background);
	border: 1px solid var(--panel-border);
	border-radius: 4px;
	color: white;
`

const AssetSelectorHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 68px;
	padding: 0px 20px;
	background-color: var(--panel-header-background);
	color: var(--header-text);
	border-radius: 4px;
	border-bottom: 1px solid var(--panel-border);
`

const HeaderContent = styled.div`
`

const ExitComponent = styled.div`
	color: var(--exit-modal-color);	
	transform: rotate(135deg);
	font-size: 22px;
	cursor: pointer;
`

const InputContainer = styled.div`
  display: flex;
  align-items: center;
	height: 60px;
	padding: 0px 20px;
  justify-content: space-between;
  color: var(--body-text);
  padding-left: 21px;
  padding-right: 21px;
  border-bottom: 1px solid var(--panel-border);
  input {
    width: 75%;
    color: var(--body-text);
    font-size: 16px;
    line-height: 19px;
    background-color: var(--panel-background);
    border: none;
    box-shadow: inset 0 0 0 1px var(--panel-background), inset 0 0 0 100px var(--panel-background);
    :-webkit-autofill,
    :-webkit-autofill:hover,
    :-webkit-autofill:focus,
    :-webkit-autofill:active, 
    :-internal-autofill-selected {
      -webkit-text-fill-color: var(--body-text);
    }
    :focus {
      outline: none
    }
  }
`

const AssetPanelContainer = styled.div`
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	justify-content: flex-start;
	max-height: 329px;
	overflow: auto; /* Enable scroll if needed */
`

const AssetPanel = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	width: 184px;
	height: 98px;
	border-right: 1px solid var(--panel-border);
	border-bottom: 1px solid var(--panel-border);
	:nth-child(3n+3) {
		border-right: none;
	}
	:nth-child(10) {
		border-bottom: none;
	}
`

const AssetWrapper = styled.div`
  display: flex;
  flex-direction: row;
  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
`

const TokenIcon = styled.img`
  width: 28px;
  height: 28px;
  margin-right: 12px;
`

const TokenName = styled.div`
  font-size: 16px;
  line-height: 19px;
  display: flex;
  align-items: center;
`

const TokenBalance = styled.div`
  font-size: 14px;
  line-height: 16px;
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--body-text);
  margin-top: 12px;
`

interface AssetData {
	address: string;
	symbol: string;
	userBalance: BigNumber | undefined;
}

const AssetSelector = ({modelOpen, setModalOpen}) => {

	// const [modelOpen, setModalOpen] = React.useState(true)



	// TODO do math and pass props into AssetPanel css to make border-bottom none for bottom row of assets
	// TODO Import list of token addresses for asset selector
	const tokenAddress = "0x009e864923b49263c7F10D19B7f8Ab7a9A5AAd33"

	const {
		root: {
			proxyStore,
			swapFormStore,
			providerStore,
			tokenStore,
			errorStore,
		},
	} = useStores();

	const { chainId, account } = providerStore.getActiveWeb3React();

	const whitelistedTokens = tokenStore.getFilteredTokenMetadata(chainId, 'DA');

	let userBalances;
	let assetSelectorData: AssetData[] = [];

	if (account) {
		userBalances = tokenStore.getAccountBalances(chainId, whitelistedTokens, account);
	}

	assetSelectorData = whitelistedTokens.map(value => {
		return {
			address: value.address,
			symbol: value.symbol,
			userBalance: userBalances ? userBalances[value.address] : 'N/A'
		}
	});

	console.log('[Filtered asset data]', assetSelectorData);

	return(
		<Container style={{display: modelOpen ? 'block' : 'none' }}>
			<ModalContent>
				<AssetSelectorHeader>
					<HeaderContent>Select Token to Sell</HeaderContent>
					<ExitComponent onClick={() => {setModalOpen(false)}}>+</ExitComponent>
				</AssetSelectorHeader>
				<InputContainer>
					<input placeholder="Search Token Name, Symbol, or Address" />
				</InputContainer>
				<AssetPanelContainer>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
					<AssetPanel>
						<AssetWrapper>
							<TokenIcon src={TokenIconAddress(tokenAddress)} />
							<TokenName>ETH</TokenName>
						</AssetWrapper>
						<TokenBalance>12,254.523 ETH</TokenBalance>
					</AssetPanel>
				</AssetPanelContainer>
			</ModalContent>
		</Container>
	)
}

export default AssetSelector