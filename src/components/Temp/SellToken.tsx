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

            updateProperty(form, 'type', SwapMethods.EXACT_OUT);

            console.log('[Swap Form]', {
                name,
                value,
                inputAmount,
                outputAmount,
                method: swapFormStore.inputs.type,
            });

            updateProperty(form, name, value);

            const inputStatus = swapFormStore.getSwapFormInputValidationStatus(
                value
            );

            if (inputStatus === InputValidationStatus.VALID) {
                const output = await previewSwapExactAmountOutHandler(); // Get preview if all necessary fields are filled out
                swapFormStore.updateInputsFromObject(output);
                swapFormStore.updateOutputsFromObject(output);
            } else {
                console.log('[Invalid Input]', inputStatus, value);
                swapFormStore.updateInputsFromObject({
                    inputAmount: '',
                    // clear preview
                });
            }
        };

        const previewSwapExactAmountOutHandler = async () => {
            const inputs = swapFormStore.inputs;
            const { inputToken, outputToken, outputAmount, type } = inputs;

            if (!outputAmount || outputAmount === '') {
                return {
                    validSwap: false,
                };
            }

            const {
                preview: { inputAmount, effectivePrice, swaps },
                validSwap,
            } = await proxyStore.previewBatchSwapExactOut(
                inputToken,
                outputToken,
                bnum(outputAmount)
            );

            if (validSwap) {
                return {
                    inputAmount: fromWei(inputAmount),
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
        const { outputAmount, setSellFocus } = inputs;

        return (
            <TokenPanel
                headerText="Token to Sell"
                defaultValue={outputAmount}
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
