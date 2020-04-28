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
import { calcMaxAmountIn, calcMinAmountOut } from '../utils/sorWrapper';
import { ExactAmountInPreview, ExactAmountOutPreview } from '../stores/Proxy';

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
            poolStore,
        },
    } = useStores();

    const supportedChainId = getSupportedChainId();
    const account = providerStore.providerStatus.account;
    const chainId = getSupportedChainId();

    if (!chainId) {
        // Review error message
        throw new Error('ChainId not loaded in TestPanel');
    }

    if (tokenIn && isEmpty(swapFormStore.inputs.inputToken)) {
        // swapFormStore is empty and has URL param - direct URL token query
        console.log(`[SwapForm] Using Input Token URL.`);
        swapFormStore.inputs.inputToken = tokenIn;
        poolStore.fetchAndSetTokenPairs(tokenIn);
    } else if (isEmpty(swapFormStore.inputs.inputToken)) {
        // No URL and no asset selected. Sets default to Eth
        console.log(`[SwapForm] No Input Token Selected, Defaulting to Eth.`);
        swapFormStore.inputs.inputToken = 'ether';
        poolStore.fetchAndSetTokenPairs('ether');
    }

    if (tokenOut && isEmpty(swapFormStore.inputs.outputToken)) {
        // swapFormStore is empty and has URL param - direct URL token query
        console.log(`[SwapForm] Using Output Token URL.`);
        swapFormStore.inputs.outputToken = tokenOut;
        poolStore.fetchAndSetTokenPairs(tokenOut);
    } else if (isEmpty(swapFormStore.inputs.outputToken)) {
        // No URL and no asset selected. Sets default to DAI
        console.log(`[SwapForm] No Output Token Selected, Defaulting to DAI.`);
        const daiAddr = contractMetadataStore.getDaiAddress();
        swapFormStore.inputs.outputToken = daiAddr;
        poolStore.fetchAndSetTokenPairs(daiAddr);
    }

    const { inputs, outputs } = swapFormStore;
    const { inputToken, outputToken } = inputs;

    useEffect(() => {
        // If input/output token have changed then query on-chain info for symbol, etc
        console.log(
            `[SwapForm] Token Change - Fetching On Chain Meta Data ${inputToken} ${outputToken}`
        );
        tokenStore.setSelectedTokenMetadata(true, inputToken, account);
        tokenStore.setSelectedTokenMetadata(false, outputToken, account);
    }, [inputToken, outputToken, tokenStore, account]); // Only re-run the effect on token address change

    const tokenMetadata = {
        input: tokenStore.inputToken,
        output: tokenStore.outputToken,
    };

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
        const tokenToUnlock = inputs.inputToken;
        const proxyAddress = contractMetadataStore.getProxyAddress();
        await tokenStore.approveMax(tokenToUnlock, proxyAddress);
    };

    const swapHandler = async () => {
        // Don't attempt Swap if preview is in progress - we don't change the UI while it's loading and hope it resolves near immediately
        if (proxyStore.isPreviewPending()) {
            return;
        }

        if (inputs.swapMethod === SwapMethods.EXACT_IN) {
            const { inputAmount, extraSlippageAllowance } = inputs;

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
                inputToken,
                bnum(inputAmount),
                tokenMetadata.input.decimals,
                outputToken,
                bnum(minAmountOut),
                tokenMetadata.output.decimals
            );
        } else if (inputs.swapMethod === SwapMethods.EXACT_OUT) {
            const { outputAmount, extraSlippageAllowance } = inputs;

            const {
                spotInput,
                expectedSlippage,
                swaps,
            } = swapFormStore.preview as ExactAmountOutPreview;

            const maxAmountIn = calcMaxAmountIn(
                spotInput,
                expectedSlippage.plus(extraSlippageAllowance)
            );

            await proxyStore.batchSwapExactOut(
                swaps,
                inputToken,
                maxAmountIn,
                tokenMetadata.input.decimals,
                outputToken,
                bnum(outputAmount),
                tokenMetadata.output.decimals
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
        const isInputValid = swapFormStore.isValidInput(inputs.inputAmount);
        const isExtraSlippageAmountValid = swapFormStore.isValidStatus(
            inputs.extraSlippageAllowanceErrorStatus
        );

        const isPreviewValid =
            swapFormStore.preview && !swapFormStore.preview.error;

        const areInputOutputTokensEqual =
            swapFormStore.inputs.inputToken ===
                swapFormStore.inputs.outputToken ||
            (swapFormStore.inputs.inputToken === 'ether' &&
                swapFormStore.inputs.outputToken ===
                    contractMetadataStore.getWethAddress()) ||
            (swapFormStore.inputs.inputToken ===
                contractMetadataStore.getWethAddress() &&
                swapFormStore.inputs.outputToken === 'ether');

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
                    bnum(inputs.inputAmount),
                    tokenMetadata.input.decimals
                );
                return inputBalance && inputBalance.gte(inputAmountBN);
            }
        }

        return false;
    };

    let userAllowance;

    if (account) {
        const proxyAddress = contractMetadataStore.getProxyAddress();
        userAllowance = tokenStore.getAllowance(
            inputToken,
            account,
            proxyAddress
        );
    }

    const buttonState = getButtonState(account, userAllowance);

    // TODO Pull validation errors and errors in errorStore together; maybe handle a stack of active errors
    const error = errorStore.getActiveError(ErrorIds.SWAP_FORM_STORE);
    if (error) {
        console.error('error', error);
    }
    const errorMessage = outputs.activeErrorMessage;
    const swapObjection = outputs.swapObjection;

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
                            tokenMetadata.input.balanceBn
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
                            tokenMetadata.input.balanceBn
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
                    key="122"
                    inputID="amount-in"
                    inputName="inputAmount"
                    tokenName={tokenMetadata.input.symbol}
                    tokenBalance={tokenMetadata.input.balanceFormatted}
                    truncatedTokenBalance={tokenMetadata.input.balanceFormatted}
                    tokenAddress={tokenMetadata.input.iconAddress}
                    errorMessage={errorMessage}
                    showMax={!!account && !!tokenMetadata.input.balanceBn}
                />
                <Switch />
                <BuyToken
                    key="123"
                    inputID="amount-out"
                    inputName="outputAmount"
                    tokenName={tokenMetadata.output.symbol}
                    tokenBalance={tokenMetadata.output.balanceFormatted}
                    truncatedTokenBalance={
                        tokenMetadata.output.balanceFormatted
                    }
                    tokenAddress={tokenMetadata.output.iconAddress}
                    errorMessage={errorMessage}
                    showMax={!!account && !!tokenMetadata.output.balanceBn}
                />
            </RowContainer>
            {renderTradeDetails(inputs.inputAmount, inputs.outputAmount)}
        </div>
    );
});

export default SwapForm;
