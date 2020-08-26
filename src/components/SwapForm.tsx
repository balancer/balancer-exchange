import React, { useEffect } from 'react';
import styled from 'styled-components';
import BuyToken from './BuyToken';
import SellToken from './SellToken';
import Switch from './Switch';
import Button from './Button';
import ErrorDisplay from './ErrorDisplay';
import SlippageSelector from './SlippageSelector';
import TradeComposition from './TradeComposition';
import AssetSelector from './AssetSelector';

import { observer } from 'mobx-react';
import { bnum, scale, isEmpty } from 'utils/helpers';
import { SwapMethods, SwapObjection } from 'stores/SwapForm';
import { useStores } from '../contexts/storesContext';
import { ErrorIds } from '../stores/Error';
import { BigNumber } from 'utils/bignumber';
import { getSupportedChainId } from '../provider/connectors';
import {
    ExactAmountInPreview,
    ExactAmountOutPreview,
    calcMaxAmountIn,
    calcMinAmountOut,
} from '../stores/Proxy';

const RowContainer = styled.div`
    font-family: var(--roboto);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

const ColumnContainer = styled.div`
    font-family: var(--roboto);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
`;

const MessageBlock = styled.div`
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    color: var(--header-text);
    text-align: center;
    margin-top: 6px;
    margin-bottom: 36px;
`;

const TradeCompositionPlaceholder = styled.div`
    height: 72px;
`;

const SlippageSelectorPlaceholder = styled.div`
    height: 84px;
`;

enum ButtonState {
    NO_WALLET,
    UNLOCK,
    SWAP,
}

const ButtonText = ['Connect Wallet', 'Unlock', 'Swap'];

const SwapForm = observer(({ tokenIn, tokenOut }) => {
    const {
        root: {
            proxyStore,
            contractMetadataStore,
            swapFormStore,
            providerStore,
            tokenStore,
            errorStore,
            dropdownStore,
        },
    } = useStores();

    const supportedChainId = getSupportedChainId();
    const account = providerStore.providerStatus.account;
    const chainId = getSupportedChainId();

    if (!chainId) {
        // Review error message
        throw new Error('ChainId not loaded in TestPanel');
    }

    useEffect(() => {
        if (tokenIn) {
            console.log(`[SwapForm] Using Input Token From URL: ${tokenIn}`);
            swapFormStore.setInputAddress(tokenIn);
        }

        if (tokenOut) {
            console.log(`[SwapForm] Using Output Token From URL: ${tokenOut}`);
            swapFormStore.setOutputAddress(tokenOut);
        }
    }, [tokenIn, tokenOut, swapFormStore, account]); // Only re-run the effect on token address change

    // This loads all the token data after selection
    const inputAddress = swapFormStore.inputToken.address;
    useEffect(() => {
        if (inputAddress !== '') {
            console.log(`[SwapForm] Setting Input Token ${inputAddress}`);
            swapFormStore.setSelectedInputToken(inputAddress, account);
        }
    }, [inputAddress, account, swapFormStore]); // Only re-run the effect on token address change

    // This loads all the token data after selection
    const outputAddress = swapFormStore.outputToken.address;
    useEffect(() => {
        if (outputAddress !== '') {
            console.log(`[SwapForm] Setting Output Token ${outputAddress}`);
            swapFormStore.setSelectedOutputToken(outputAddress, account);
        }
    }, [outputAddress, account, swapFormStore]); // Only re-run the effect on token address change

    const buttonActionHandler = (buttonState: ButtonState) => {
        switch (buttonState) {
            case ButtonState.NO_WALLET:
                dropdownStore.toggleWalletDropdown();
                break;
            case ButtonState.SWAP:
                swapHandler();
                break;
            case ButtonState.UNLOCK:
                unlockHandler();
                break;
            default:
                throw new Error('Invalid button state');
        }
    };

    const unlockHandler = async () => {
        const tokenToUnlock = swapFormStore.inputToken.address;
        const proxyAddress = contractMetadataStore.getProxyAddress();
        await tokenStore.approveMax(tokenToUnlock, proxyAddress);
    };

    const swapHandler = async () => {
        // Don't attempt Swap if preview is in progress - we don't change the UI while it's loading and hope it resolves near immediately
        if (proxyStore.isPreviewPending()) {
            return;
        }

        if (swapFormStore.inputs.swapMethod === SwapMethods.EXACT_IN) {
            const {
                inputAmount,
                extraSlippageAllowance,
            } = swapFormStore.inputs;

            const {
                spotOutput,
                expectedSlippage,
                swaps,
            } = swapFormStore.preview as ExactAmountInPreview;

            const minAmountOut = calcMinAmountOut(
                spotOutput,
                expectedSlippage.plus(bnum(extraSlippageAllowance))
            );

            await proxyStore.batchSwapExactIn(
                swaps,
                swapFormStore.inputToken.address,
                bnum(inputAmount),
                swapFormStore.inputToken.decimals,
                swapFormStore.outputToken.address,
                bnum(minAmountOut),
                swapFormStore.outputToken.decimals
            );
        } else if (swapFormStore.inputs.swapMethod === SwapMethods.EXACT_OUT) {
            const {
                outputAmount,
                extraSlippageAllowance,
            } = swapFormStore.inputs;

            const {
                spotInput,
                expectedSlippage,
                swaps,
                totalInput,
            } = swapFormStore.preview as ExactAmountOutPreview;

            const maxAmountIn = calcMaxAmountIn(
                spotInput,
                expectedSlippage.plus(extraSlippageAllowance)
            );

            let maxIn = maxAmountIn.gt(totalInput) ? maxAmountIn : totalInput;

            await proxyStore.batchSwapExactOut(
                swaps,
                swapFormStore.inputToken.address,
                maxIn, //totalInput, //maxAmountIn,
                swapFormStore.inputToken.decimals,
                swapFormStore.outputToken.address,
                bnum(outputAmount),
                swapFormStore.outputToken.decimals
            );
        }
    };

    const getButtonState = (
        account,
        userAllowance: BigNumber | undefined
    ): ButtonState => {
        const sufficientAllowance = userAllowance && userAllowance.gt(0);
        const chainId = providerStore.providerStatus.activeChainId;
        if (chainId && chainId !== supportedChainId) {
            return ButtonState.SWAP;
        }

        if (account) {
            if (!sufficientAllowance) {
                return ButtonState.UNLOCK;
            }
            return ButtonState.SWAP;
        }

        return ButtonState.NO_WALLET;
    };

    const getButtonText = (buttonState: ButtonState): string => {
        return ButtonText[buttonState];
    };

    const getButtonActive = (
        buttonState: ButtonState,
        inputBalance: BigNumber | undefined
    ): boolean => {
        const isInputValid = swapFormStore.isValidInput(
            swapFormStore.inputs.inputAmount
        );
        const isExtraSlippageAmountValid = swapFormStore.isValidStatus(
            swapFormStore.inputs.extraSlippageAllowanceErrorStatus
        );

        const isPreviewValid =
            swapFormStore.preview && !swapFormStore.preview.error;

        const areInputOutputTokensEqual =
            swapFormStore.inputToken.address ===
                swapFormStore.outputToken.address ||
            (swapFormStore.inputToken.address === 'ether' &&
                swapFormStore.outputToken.address ===
                    contractMetadataStore.getWethAddress()) ||
            (swapFormStore.inputToken.address ===
                contractMetadataStore.getWethAddress() &&
                swapFormStore.outputToken.address === 'ether');

        if (
            buttonState === ButtonState.UNLOCK ||
            buttonState === ButtonState.NO_WALLET
        ) {
            return true;
        }

        if (buttonState === ButtonState.SWAP) {
            if (
                isInputValid &&
                isExtraSlippageAmountValid &&
                chainId &&
                isPreviewValid &&
                !areInputOutputTokensEqual &&
                chainId === supportedChainId
            ) {
                const inputAmountBN = scale(
                    bnum(swapFormStore.inputs.inputAmount),
                    swapFormStore.inputToken.decimals
                );
                return inputBalance && inputBalance.gte(inputAmountBN);
            }
        }

        return false;
    };

    let userAllowance = swapFormStore.inputToken.allowance;

    const buttonState = getButtonState(account, userAllowance);

    // TODO Pull validation errors and errors in errorStore together; maybe handle a stack of active errors
    const error = errorStore.getActiveError(ErrorIds.SWAP_FORM_STORE);
    if (error) {
        console.error('error', error);
    }
    const errorMessage = swapFormStore.outputs.activeErrorMessage;
    const swapObjection = swapFormStore.outputs.swapObjection;

    const renderMessageBlock = () => {
        if (!isEmpty(errorMessage)) {
            return <ErrorDisplay errorText={errorMessage} />;
        } else {
            return <MessageBlock>Enter Order Details to Continue</MessageBlock>;
        }
    };

    const renderTradeDetails = (inputAmount, outputAmount) => {
        // If we have an error from the input validation or swap preview
        if (
            (isEmpty(inputAmount) && isEmpty(outputAmount)) ||
            !isEmpty(errorMessage)
        ) {
            return (
                <ColumnContainer>
                    <TradeCompositionPlaceholder />
                    {renderMessageBlock()}
                    <SlippageSelectorPlaceholder />
                    <Button
                        buttonText={getButtonText(buttonState)}
                        active={getButtonActive(
                            buttonState,
                            swapFormStore.inputToken.balanceBn
                        )}
                        onClick={() => {
                            buttonActionHandler(buttonState);
                        }}
                    />
                </ColumnContainer>
            );
        } else {
            return (
                <ColumnContainer>
                    <TradeComposition />
                    <ErrorDisplay
                        errorText={
                            swapObjection === SwapObjection.NONE
                                ? ''
                                : swapObjection
                        }
                    />
                    <SlippageSelector />
                    <Button
                        buttonText={getButtonText(buttonState)}
                        active={getButtonActive(
                            buttonState,
                            swapFormStore.inputToken.balanceBn
                        )}
                        onClick={() => {
                            buttonActionHandler(buttonState);
                        }}
                    />
                </ColumnContainer>
            );
        }
    };

    return (
        <div>
            <AssetSelector />
            <RowContainer>
                <SellToken
                    inputName="inputAmount"
                    tokenSymbol={swapFormStore.inputToken.symbol}
                    tokenName={swapFormStore.inputToken.name}
                    tokenBalance={swapFormStore.inputToken.balanceFormatted}
                    truncatedTokenBalance={
                        swapFormStore.inputToken.balanceFormatted
                    }
                    tokenAddress={swapFormStore.inputToken.address}
                    tokenHasIcon={swapFormStore.inputToken.hasIcon}
                    errorMessage={errorMessage}
                    showMax={!!account && !!swapFormStore.inputToken.balanceBn}
                />
                <Switch />
                <BuyToken
                    inputName="outputAmount"
                    tokenSymbol={swapFormStore.outputToken.symbol}
                    tokenName={swapFormStore.outputToken.name}
                    tokenBalance={swapFormStore.outputToken.balanceFormatted}
                    truncatedTokenBalance={
                        swapFormStore.outputToken.balanceFormatted
                    }
                    tokenAddress={swapFormStore.outputToken.address}
                    tokenHasIcon={swapFormStore.outputToken.hasIcon}
                    errorMessage={errorMessage}
                    showMax={!!account && !!swapFormStore.outputToken.balanceBn}
                />
            </RowContainer>
            {renderTradeDetails(
                swapFormStore.inputs.inputAmount,
                swapFormStore.inputs.outputAmount
            )}
        </div>
    );
});

export default SwapForm;
