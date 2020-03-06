import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../contexts/storesContext';
import {
    InputFocus,
    InputValidationStatus,
    SwapMethods,
} from 'stores/SwapForm';
import { bnum } from 'utils/helpers';
import { ExactAmountOutPreview } from '../stores/Proxy';

const BuyToken = observer(
    ({
        inputID,
        inputName,
        tokenName,
        tokenBalance,
        truncatedTokenBalance,
        tokenAddress,
        errorMessage,
        showMax,
    }) => {
        const {
            root: { providerStore, proxyStore, swapFormStore, tokenStore },
        } = useStores();

        const { account, chainId } = providerStore.getActiveWeb3React();

        const onChange = async event => {
            const { value } = event.target;
            updateSwapFormData(value);
        };

        /* To protect against race conditions in this async method we check
        for staleness of inputAmount after getting preview and before making updates */
        const updateSwapFormData = async value => {
            swapFormStore.setInputFocus(InputFocus.BUY);
            swapFormStore.inputs.swapMethod = SwapMethods.EXACT_OUT;
            swapFormStore.inputs.outputAmount = value;

            const inputStatus = swapFormStore.validateSwapValue(value);

            if (inputStatus === InputValidationStatus.VALID) {
                await swapFormStore.refreshExactAmountOutPreview();
            } else {
                swapFormStore.refreshInvalidOutputAmount(value, inputStatus);
            }
        };

        const { inputs } = swapFormStore;
        const { outputAmount, setBuyFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Buy"
                defaultValue={outputAmount}
                onChange={e => onChange(e)}
                updateSwapFormData={updateSwapFormData}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                truncatedTokenBalance={truncatedTokenBalance}
                tokenAddress={tokenAddress}
                setFocus={setBuyFocus}
                errorMessage={errorMessage}
                showMax={showMax}
            />
        );
    }
);

export default BuyToken;
