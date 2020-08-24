import React from 'react';
import { observer } from 'mobx-react';
import styled, { keyframes } from 'styled-components';
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

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const Spinner = styled.img`
    animation: 2s ${rotate} linear infinite;
    width: 80px;
    height: 80px;
`;

const Switch = observer(() => {
    const {
        root: { swapFormStore },
    } = useStores();

    const switchAssets = () => {
        swapFormStore.switchInputOutputValues();
    };

    const showLoader = swapFormStore.showLoader;

    return (
        <Container>
            <Spinner
                src="/circle.svg"
                style={{ display: showLoader ? 'block' : 'none' }}
            />
            <SwapIcon
                src="/swap.svg"
                onClick={() => switchAssets()}
                style={{ display: showLoader ? 'none' : 'block' }}
            />
        </Container>
    );
});

export default Switch;
