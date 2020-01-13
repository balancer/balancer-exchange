import React from 'react'
import styled from 'styled-components'
import { isAddress } from '../../utils/helpers'

import { useEffect, useRef } from 'react'

const Panel = styled.div`
  width: 180px;
  height: 203px;
  background-color: var(--panel-background);
  border: 1px solid var(--panel-border);
  border-radius: 4px;
`

const PanelHeader = styled.div`
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Roboto;
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  color: var(--header-text);
  background-color: var(--panel-header-background);
  border-radius: 4px;
`

const TokenContainer = styled.div`
  height: 94px;
  color: var(--header-text);
  border-top: 1px solid var(--panel-border);
  border-bottom: 1px solid var(--panel-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`

const IconAndNameContainer = styled.div`
  display: flex;
  flex-direction: row;
`

export const TokenIconAddress = address =>
  `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${isAddress(
    address
  )}/logo.png`

const TokenIcon = styled.img`
  width: 28px;
  height: 28px;
  margin-right: 12px;
`

const TokenName = styled.div`
  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  font-size: 16px;
  line-height: 19px;
  display: flex;
  align-items: center;
`

const TokenBalance = styled.div`
  font-family: Roboto;
  font-style: normal;
  font-weight: normal;
  font-size: 14px;
  line-height: 16px;
  display: flex;
  align-items: center;
  text-align: center;
  color: var(--body-text);
  margin-top: 12px;
`

const InputWrapper = styled.div`
  height: 61px;
  font-family: Roboto;
  font-style: normal;
  font-weight: 500;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--body-text);
  padding-left: 21px;
  padding-right: 21px;
  input {
    width: 100px;
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

const MaxLink = styled.div`
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  display: flex;
  text-decoration-line: underline;
  color: var(--link-text);
`

const Token = ({defaultValue, onChange, inputID, inputName, headerText, tokenName, tokenBalance, tokenAddress, setModalOpen, setFocus}) => {

  const textInput = useRef(null);

  useEffect(() => {
    if (setFocus) {
      textInput.current.focus();
    }
  });


  const InputContainer = () => {
    // TODO make sure conditional is checking the correct thing
    if(tokenName == "ETH") {
      return(
        <InputWrapper>
          <input placeholder="0" />
        </InputWrapper>
      )
    } else {
      return(
        <InputWrapper>
          <input id={inputID} name={inputName} defaultValue={defaultValue} onChange={onChange} ref={textInput} placeholder="0" />
          <MaxLink>Max</MaxLink>
        </InputWrapper>
      )
    }
  }

  return (
    <Panel>
      <PanelHeader>
        {headerText}
      </PanelHeader>
      <TokenContainer onClick={ () => { setModalOpen({state: true, input: inputName}) } }>
        <IconAndNameContainer>
          <TokenIcon src={TokenIconAddress(tokenAddress)} />
          <TokenName>
            {tokenName}
          </TokenName>
        </IconAndNameContainer>
        <TokenBalance>
          {tokenName} {tokenBalance}
        </TokenBalance>
      </TokenContainer>
      <InputContainer />
    </Panel>
  )
}

export default Token
