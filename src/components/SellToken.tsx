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
import { ExactAmountInPreview } from 'stores/Proxy';

const SellToken = observer(
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
            swapFormStore.setInputFocus(InputFocus.SELL);
            swapFormStore.inputs.swapMethod = SwapMethods.EXACT_IN;
            swapFormStore.inputs.inputAmount = value;

            const inputStatus = swapFormStore.validateSwapValue(value);

            if (inputStatus === InputValidationStatus.VALID) {
                await swapFormStore.refreshExactAmountInPreview();
            } else {
                swapFormStore.refreshInvalidInputAmount(value, inputStatus);
            }
        };

        const { inputs } = swapFormStore;
        const { inputAmount, setSellFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Sell"
                defaultValue={inputAmount}
                onChange={e => onChange(e)}
                updateSwapFormData={updateSwapFormData}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                truncatedTokenBalance={truncatedTokenBalance}
                tokenAddress={tokenAddress}
                setFocus={setSellFocus}
                errorMessage={errorMessage}
                showMax={showMax}
            />
        );
    }
);

export default SellToken;
