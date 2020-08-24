import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../contexts/storesContext';

const BuyToken = observer(
    ({
        inputName,
        tokenName,
        tokenBalance,
        truncatedTokenBalance,
        tokenAddress,
        errorMessage,
        showMax,
    }) => {
        const {
            root: { swapFormStore },
        } = useStores();

        const onChange = async event => {
            const { value } = event.target;
            updateSwapFormData(value);
        };

        /* To protect against race conditions in this async method we check
        for staleness of inputAmount after getting preview and before making updates */
        const updateSwapFormData = async value => {
            await swapFormStore.refreshSwapFormPreviewEAO(value);
        };

        const { inputs } = swapFormStore;
        const { outputAmount } = inputs;

        return (
            <TokenPanel
                headerText="Token to Buy"
                value={outputAmount}
                onChange={e => onChange(e)}
                updateSwapFormData={updateSwapFormData}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                truncatedTokenBalance={truncatedTokenBalance}
                tokenAddress={tokenAddress}
                errorMessage={errorMessage}
                showMax={false}
            />
        );
    }
);

export default BuyToken;
