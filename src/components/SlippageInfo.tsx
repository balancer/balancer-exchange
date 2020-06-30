import React from 'react';
import Popup from 'reactjs-popup';
import styled from 'styled-components';
import { observer } from 'mobx-react';
import { useStores } from '../contexts/storesContext';
import { InputValidationStatus, SwapObjection } from '../stores/SwapForm';
import { formatPctString, bnum } from '../utils/helpers';

const SlippageInfoContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    color: ${props =>
        props.slippageIndicator ? 'var(--error-color)' : 'var(--header-text)'};
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    margin-bottom: 28px;
`;

const SlippageInlineDisplay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 24px;
    border: 1px solid var(--link-text);
    border-color: ${props =>
        props.errorStatus === InputValidationStatus.VALID &&
        !props.slippageIndicator
            ? 'var(--link-text)'
            : 'var(--error-color)'};
    box-sizing: border-box;
    border-radius: 4px;
    margin-left: 10px;
    margin-right: 10px;
    color: ${props =>
        props.errorStatus === InputValidationStatus.VALID &&
        !props.slippageIndicator
            ? 'var(--link-text)'
            : 'var(--error-color)'};
    cursor: pointer;
`;

const InfoPopover = styled.img`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    margin-left: 10px;
    cursor: pointer;
`;

const WarningIcon = styled.img`
    width: 22px;
    height: 26px;
    margin-right: 11px;
    color: var(--error-color);
`;

const SlippageInfo = observer(() => {
    const {
        root: { swapFormStore },
    } = useStores();
    const {
        inputs: { extraSlippageAllowance },
        outputs: { expectedSlippage },
        slippageSelectorOpen,
    } = swapFormStore;

    let slippageIndicator = false;

    if (swapFormStore.outputs.swapObjection !== SwapObjection.NONE)
        slippageIndicator = true;

    if (expectedSlippage > '5') {
        slippageIndicator = true;
    }

    const Warning = () => {
        if (slippageIndicator) {
            return <WarningIcon src="WarningSign.svg" />;
        } else {
            return <div />;
        }
    };

    const toggleDropDown = () => {
        if (slippageSelectorOpen) {
            return swapFormStore.setSlippageSelectorOpen(false);
        } else {
            return swapFormStore.setSlippageSelectorOpen(true);
        }
    };

    return (
        <SlippageInfoContainer slippageIndicator={slippageIndicator}>
            {Warning()}
            <div>
                Expected price slippage of{' '}
                {formatPctString(bnum(expectedSlippage))} with
            </div>
            <SlippageInlineDisplay
                errorStatus={swapFormStore.getSlippageSelectorErrorStatus()}
                slippageIndicator={slippageIndicator}
                onClick={() => {
                    toggleDropDown();
                }}
            >
                {swapFormStore.getSlippageSelectorErrorStatus() ===
                InputValidationStatus.VALID
                    ? `${extraSlippageAllowance}%`
                    : `-`}
            </SlippageInlineDisplay>
            <div>additional limit</div>
            <Popup
                trigger={<InfoPopover src="info.svg" />}
                position="top center"
                on="hover"
            >
                <div>
                    <div>
                        Additional slippage is the most you are willing to pay
                        on top of the expected slippage in case other trades are
                        confirmed before yours. Beyond that the transaction will
                        fail.
                    </div>
                </div>
            </Popup>
        </SlippageInfoContainer>
    );
});

export default SlippageInfo;
