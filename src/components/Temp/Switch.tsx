import React from 'react';
import styled from 'styled-components';
import { useStores } from '../../contexts/storesContext';

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
        root: {
            proxyStore,
            swapFormStore,
            providerStore,
            tokenStore,
            errorStore,
        },
    } = useStores();

    const { inputs, outputs } = swapFormStore;
    const {
        inputToken,
        inputTicker,
        inputIconAddress,
        inputPrecision,
        outputToken,
        outputTicker,
        outputIconAddress,
        outputPrecision,
    } = inputs;

    const clearInputs = () => {
        swapFormStore.inputs.inputAmount = '';
        swapFormStore.inputs.outputAmount = '';
        swapFormStore.inputs.activeErrorMessage = '';
    };

    const switchAssets = () => {
        swapFormStore.inputs.inputToken = outputToken;
        swapFormStore.inputs.inputTicker = outputTicker;
        swapFormStore.inputs.inputIconAddress = outputIconAddress;
        swapFormStore.inputs.inputPrecision= outputPrecision;
        swapFormStore.inputs.outputToken = inputToken;
        swapFormStore.inputs.outputTicker = inputTicker;
        swapFormStore.inputs.outputIconAddress = inputIconAddress;
        swapFormStore.inputs.outputPrecision = inputPrecision;
        swapFormStore.resetTradeComposition();
        clearInputs();
    };

    return (
        <Container>
            <SwapIcon src="/swap.svg" onClick={() => switchAssets()} />
        </Container>
    );
};

export default Switch;
