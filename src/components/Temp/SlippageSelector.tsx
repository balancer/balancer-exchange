import React, { useState } from 'react';
import styled from 'styled-components';
import { useStores } from '../../contexts/storesContext';
import SlippageInfo from './SlippageInfo';
import { InputValidationStatus } from '../../stores/SwapForm';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-bottom: 32px;
`;

const SelectorDropDown = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 500px;
    height: 38px;
    border-radius: 6px;
    position: relative;
`;

const SelectorDropDownCell = styled.div`
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
    width: 125px;
    display: flex;
    position: relative;
    background: var(--selector-background);
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
    cursor: pointer;
    z-index: 1;
`;

const ActiveSelectorDropDownCell = styled(SelectorDropDownCell)`
    color: var(--highlighted-selector-text);
    border: 1px solid var(--highlighted-selector-border);
    background: var(--highlighted-selector-background);
    margin-left: -1px;
    :nth-child(1) {
        border-left: 1px solid var(--highlighted-selector-border);
    }
`;

const Arrow = styled.div`
    width: 12px;
    height: 12px;
    background: #7785d5;
    transform: rotate(45deg);
    position: absolute;
    top: -6px;
    right: 185px;
`;

const InputWrapper = styled.div`
    font-family: Roboto;
    font-weight: 500;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--body-text);
    input {
        width: 60%;
        color: var(--body-text);
        font-size: 16px;
        line-height: 19px;
        text-align: center;
        background-color: var(--highlighted-selector-background);
        border: none;
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
`;

const SlippageSelector = ({
    expectedSlippage,
    slippageSelectorOpen,
    setSlippageSelectorOpen,
}) => {
    const [currentCell, setCurrentCell] = useState('3');

    const {
        root: { swapFormStore },
    } = useStores();

    const updateSlippage = (cellIndex, slippageValue) => {
        setCurrentCell(cellIndex);
        swapFormStore.setExtraSlippageAllowance(slippageValue);
    };

    const onChange = event => {
        const { value } = event.target;
        console.log('Update Slippage', {
            value,
        });

        const inputStatus = swapFormStore.getNumberInputValidationStatus(
            value,
            {
                limitDigits: true,
            }
        );

        if (inputStatus === InputValidationStatus.VALID) {
            swapFormStore.setExtraSlippageAllowance(value);
        }
    };

    const CellGenerator = ({ children, cellIndex, slippageValue }) => {
        if (currentCell == cellIndex) {
            return (
                <ActiveSelectorDropDownCell>
                    {children}
                </ActiveSelectorDropDownCell>
            );
        } else {
            return (
                <SelectorDropDownCell
                    onClick={() => {
                        updateSlippage(cellIndex, slippageValue);
                    }}
                >
                    {children}
                </SelectorDropDownCell>
            );
        }
    };

    const CustomCell = ({ cellIndex }) => {
        if (currentCell == cellIndex) {
            return (
                <ActiveSelectorDropDownCell>
                    <InputWrapper>
                        <input
                            placeholder="0"
                            defaultValue={
                                swapFormStore.inputs.extraSlippageAllowance
                            }
                            onChange={e => onChange(e)}
                        />
                        %
                    </InputWrapper>
                </ActiveSelectorDropDownCell>
            );
        } else {
            return (
                <SelectorDropDownCell
                    onClick={() => {
                        setCurrentCell(cellIndex);
                    }}
                >
                    Custom %
                </SelectorDropDownCell>
            );
        }
    };

    return (
        <Container>
            <SlippageInfo
                expectedSlippage={expectedSlippage}
                setSlippageSelectorOpen={setSlippageSelectorOpen}
            />
            <SelectorDropDown
                style={{ display: slippageSelectorOpen ? 'flex' : 'none' }}
            >
                <CellGenerator cellIndex="1" slippageValue="0.1">
                    0.1%
                </CellGenerator>
                <CellGenerator cellIndex="2" slippageValue="0.5">
                    0.5%
                </CellGenerator>
                <CellGenerator cellIndex="3" slippageValue="1.0">
                    1.0%
                </CellGenerator>
                <Arrow />
                <CustomCell cellIndex="4" />
            </SelectorDropDown>
        </Container>
    );
};

export default SlippageSelector;
