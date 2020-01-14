import React from 'react';
import TokenPanel from './TokenPanel';
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';
import { formNames, InputValidationStatus, SwapMethods } from 'stores/SwapForm';
import { bnum, fromWei } from 'utils/helpers';

const SellToken = observer(
    ({
        inputID,
        inputName,
        tokenName,
        tokenBalance,
        tokenAddress,
        setModalOpen,
    }) => {
        const {
            root: {
                proxyStore,
                swapFormStore,
                providerStore,
                tokenStore,
                errorStore,
            },
        } = useStores();

        const updateProperty = (form, key, value) => {
            swapFormStore[form][key] = value;
        };

        const onChange = async (event, form) => {
            const { name, value } = event.target;
            const { inputAmount, outputAmount } = swapFormStore.inputs;

            swapFormStore.inputs.setBuyFocus = false;
            swapFormStore.inputs.setSellFocus = true;

            updateProperty(form, 'type', SwapMethods.EXACT_IN);

            console.log('[Swap Form]', {
                name,
                value,
                inputAmount,
                outputAmount,
                method: swapFormStore.inputs.type,
            });

            updateProperty(form, name, value);

            const inputStatus = swapFormStore.getSwapFormInputValidationStatus(value);

            if (inputStatus === InputValidationStatus.VALID) {
                const output = await previewSwapExactAmountInHandler(); // Get preview if all necessary fields are filled out
                swapFormStore.updateInputsFromObject(output);
                swapFormStore.updateOutputsFromObject(output);
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                swapFormStore.updateInputsFromObject({
                    outputAmount: '',
                    // clear preview
                });
            }
        };

        const previewSwapExactAmountInHandler = async () => {
            const inputs = swapFormStore.inputs;
            const { inputToken, outputToken, inputAmount } = inputs;

            if (!inputAmount || inputAmount === '') {
                return {
                    validSwap: false,
                };
            }

            const {
                preview: { outputAmount, effectivePrice, swaps },
                validSwap,
            } = await proxyStore.previewBatchSwapExactIn(
                inputToken,
                outputToken,
                bnum(inputAmount)
            );

            if (validSwap) {
                return {
                    outputAmount: fromWei(outputAmount),
                    effectivePrice,
                    swaps,
                    validSwap,
                };
            } else {
                return {
                    validSwap,
                };
            }
        };

        const { inputs, outputs } = swapFormStore;
        const { inputAmount, setSellFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Sell"
                defaultValue={inputAmount}
                onChange={e => onChange(e, formNames.INPUT_FORM)}
                inputID={inputID}
                inputName={inputName}
                tokenName={tokenName}
                tokenBalance={tokenBalance}
                tokenAddress={tokenAddress}
                setModalOpen={setModalOpen}
                setFocus={setSellFocus}
            />
        );
    }
);

export default SellToken;
