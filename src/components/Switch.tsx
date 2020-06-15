import React from 'react';
import styled from 'styled-components';
import { useStores } from '../contexts/storesContext';

const Container = styled.div`
	display: flex;
	justify-content: center;
	align-items: center
	width: 148px;
`;

const SwapIcon = styled.img`
    width: 24px;
    height: 24px;
    cursor: pointer;
`;

const Switch = () => {
    const {
        root: { swapFormStore },
    } = useStores();

    const switchAssets = () => {
        swapFormStore.switchInputOutputValues();
        const inputValue = swapFormStore.getActiveInputValue();
        swapFormStore.refreshSwapFormPreview(
            inputValue,
            swapFormStore.inputs.swapMethod
        );
        if (swapFormStore.exchangeRateInput) {
            return swapFormStore.setExchangeRateInput(false);
        } else {
            return swapFormStore.setExchangeRateInput(true);
        }

        // swapFormStore.clearInputs();
    };

    return (
        <Container>
            <SwapIcon src="/swap.svg" onClick={() => switchAssets()} />
        </Container>
    );
};

export default Switch;
