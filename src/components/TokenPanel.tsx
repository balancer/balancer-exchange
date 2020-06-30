import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { isAddress } from '../utils/helpers';
import { EtherKey } from '../stores/Token';
import { ModalType } from '../stores/SwapForm';
import { observer } from 'mobx-react';
import { useStores } from '../contexts/storesContext';

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
    :hover {
        background-color: var(--panel-hover-background);
        border: 1px solid var(--panel-hover-border);
        margin-left: -1px;
        margin-right: -1px;
        margin-bottom: -1px;
    }
`;

const IconAndNameContainer = styled.div`
    display: flex;
    flex-direction: row;
`;

export const TokenIconAddress = address => {
    if (address === 'ether') {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png`;
    } else if (address === 'unknown') {
        return './empty-token.png';
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
    padding-left: 21px;
    padding-right: 21px;
    border-top: 1px solid var(--panel-border);
    border-radius: 0px 0px 4px 4px;
    input {
        width: 100px;
        color: var(--input-text);
        font-size: 16px;
        font-weight: 500;
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
        ::placeholder {
            color: var(--input-placeholder-text);
        }
        :focus {
            outline: none;
        }
    }
    border: ${props =>
        props.errorBorders ? '1px solid var(--error-color)' : ''};
    margin-left: ${props => (props.errorBorders ? '-1px' : '0px')}
    margin-right: ${props => (props.errorBorders ? '-1px' : '0px')}
    :hover {
        background-color: var(--input-hover-background);
        border: ${props =>
            props.errorBorders
                ? '1px solid var(--error-color)'
                : '1px solid var(--input-hover-border);'};
        margin-left: -1px;
        margin-right: -1px;
        input {
            background-color: var(--input-hover-background);
            box-shadow: inset 0 0 0 1px var(--input-hover-background),
                inset 0 0 0 100px var(--input-hover-background);
            ::placeholder {
                color: var(--input-hover-placeholder-text);
                background-color: var(--input-hover-background);
            }
        }
    }
`;

const MaxLink = styled.div`
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    display: flex;
    text-decoration-line: underline;
    color: var(--link-text);
    cursor: pointer;
`;

const Token = observer(
    ({
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
        setFocus,
        errorMessage,
        showMax,
    }) => {
        const textInput = useRef(null);
        const {
            root: { swapFormStore },
        } = useStores();

        useEffect(() => {
            if (setFocus) {
                textInput.current.focus();
            }
        });

        const modalType =
            inputName === 'inputAmount' ? ModalType.INPUT : ModalType.OUTPUT;

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
                    {(tokenAddress === EtherKey &&
                        modalType === ModalType.INPUT) ||
                    !showMax ? (
                        <div />
                    ) : (
                        <MaxLink
                            onClick={() => updateSwapFormData(tokenBalance)}
                        >
                            Max
                        </MaxLink>
                    )}
                </InputWrapper>
            );
        };

        const IconError = e => {
            e.target.src = './empty-token.png';
        };

        return (
            <Panel>
                <PanelHeader>{headerText}</PanelHeader>
                <TokenContainer
                    onClick={() => {
                        swapFormStore.openModal(modalType);
                    }}
                >
                    <IconAndNameContainer>
                        <TokenIcon
                            src={TokenIconAddress(tokenAddress)}
                            onError={e => {
                                IconError(e);
                            }}
                        />
                        <TokenName>{tokenName}</TokenName>
                    </IconAndNameContainer>
                    <TokenBalance>
                        {truncatedTokenBalance} {tokenName}
                    </TokenBalance>
                </TokenContainer>
                <InputContainer errorMessage={errorMessage} />
            </Panel>
        );
    }
);

export default Token;
