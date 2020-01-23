import React from 'react';
import styled from 'styled-components';
import Popup from 'reactjs-popup';
import { isAddress } from '../../utils/helpers';

import { useEffect, useRef } from 'react';
import { EtherKey } from '../../stores/Token';

const Panel = styled.div`
    width: 180px;
    height: 203px;
    background-color: var(--panel-background);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
`;

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
`;

const TokenContainer = styled.div`
    height: 94px;
    color: var(--header-text);
    border-top: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
`;

const IconAndNameContainer = styled.div`
    display: flex;
    flex-direction: row;
`;

export const TokenIconAddress = address => {
    if (address === 'ether') {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png`;
    } else {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${isAddress(
            address
        )}/logo.png`;
    }
};
const TokenIcon = styled.img`
    width: 28px;
    height: 28px;
    margin-right: 12px;
`;

const TokenName = styled.div`
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
    font-size: 16px;
    line-height: 19px;
    display: flex;
    align-items: center;
`;

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
`;

const InputWrapper = styled.div`
    height: 60px;
    font-family: Roboto;
    font-style: normal;
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--body-text);
    padding-left: 21px;
    padding-right: 21px;
    border-top: 1px solid var(--panel-border);
    border-radius: 0px 0px 4px 4px;
    input {
        width: 100px;
        color: var(--body-text);
        font-size: 16px;
        line-height: 19px;
        background-color: var(--panel-background);
        border: none;
        box-shadow: inset 0 0 0 1px var(--panel-background),
            inset 0 0 0 100px var(--panel-background);
        :-webkit-autofill,
        :-webkit-autofill:hover,
        :-webkit-autofill:focus,
        :-webkit-autofill:active,
        :-internal-autofill-selected {
            -webkit-text-fill-color: var(--body-text);
        }
        :focus {
            outline: none;
        }
    }
    border: ${props =>
        props.errorBorders ? '1px solid var(--error-color)' : ''};
`;

const InputErrorWrapper = styled(InputWrapper)``;

const MaxLink = styled.div`
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    display: flex;
    text-decoration-line: underline;
    color: var(--link-text);
    cursor: pointer;
`;

const PopupTokenBalance = styled.div`
    width: 200px;
    word-wrap: break-word;
`;

const Token = ({
    defaultValue,
    onChange,
    updateSwapFormData,
    inputID,
    inputName,
    headerText,
    tokenName,
    tokenBalance,
    truncatedTokenBalance,
    tokenAddress,
    setModalOpen,
    setFocus,
    errorMessage,
    showMax,
}) => {
    const textInput = useRef(null);

    useEffect(() => {
        if (setFocus) {
            textInput.current.focus();
        }
    });

    const InputContainer = ({ errorMessage }) => {
        // TODO make sure conditional is checking the correct thing
        const errorBorders = errorMessage === '' ? false : true;
        return (
            <InputWrapper errorBorders={errorBorders}>
                <input
                    id={inputID}
                    name={inputName}
                    defaultValue={defaultValue}
                    onChange={onChange}
                    ref={textInput}
                    placeholder="0"
                />
                {(tokenAddress === EtherKey && inputName === 'inputAmount') ||
                !showMax ? (
                    <div />
                ) : (
                    <MaxLink onClick={() => updateSwapFormData(tokenBalance)}>
                        Max
                    </MaxLink>
                )}
            </InputWrapper>
        );
    };

    return (
        <Panel>
            <PanelHeader>{headerText}</PanelHeader>
            <TokenContainer
                onClick={() => {
                    setModalOpen({ state: true, input: inputName });
                }}
            >
                <IconAndNameContainer>
                    <TokenIcon src={TokenIconAddress(tokenAddress)} />
                    <TokenName>{tokenName}</TokenName>
                </IconAndNameContainer>

                <Popup
                    trigger={
                        <TokenBalance>
                            {tokenName} {truncatedTokenBalance}
                        </TokenBalance>
                    }
                    position="top center"
                    on="hover"
                >
                    <div>
                        <PopupTokenBalance>{tokenBalance}</PopupTokenBalance>
                    </div>
                </Popup>
            </TokenContainer>
            <InputContainer errorMessage={errorMessage} />
        </Panel>
    );
};

export default Token;
