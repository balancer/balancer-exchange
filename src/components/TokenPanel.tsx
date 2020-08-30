import React from 'react';
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

export const TokenIconAddress = (address, hasIcon) => {
    if (address === 'ether') {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png`;
    } else if (!hasIcon) {
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
        value,
        onChange,
        updateSwapFormData,
        inputID,
        inputName,
        headerText,
        tokenSymbol,
        tokenName,
        tokenBalance,
        truncatedTokenBalance,
        tokenAddress,
        tokenHasIcon,
        errorMessage,
        showMax,
    }) => {
        const {
            root: { swapFormStore },
        } = useStores();

        const IconError = e => {
            e.target.src = './empty-token.png';
        };

        const modalType =
            inputName === 'inputAmount' ? ModalType.INPUT : ModalType.OUTPUT;

        return (
            <Panel>
                <PanelHeader>{headerText}</PanelHeader>
                <TokenContainer
                    onClick={() => {
                        swapFormStore.setAssetModalState({
                            open: true,
                            input: inputName,
                        });
                    }}
                >
                    <IconAndNameContainer>
                        <TokenIcon
                            src={TokenIconAddress(tokenAddress, tokenHasIcon)}
                            onError={e => {
                                IconError(e);
                            }}
                        />
                        <TokenName>{tokenSymbol}</TokenName>
                    </IconAndNameContainer>
                    <TokenBalance>
                        {truncatedTokenBalance} {tokenSymbol}
                    </TokenBalance>
                </TokenContainer>
                <InputWrapper errorBorders={errorMessage !== ''}>
                    <input value={value} onChange={onChange} placeholder="0" />
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
            </Panel>
        );
    }
);

export default Token;
