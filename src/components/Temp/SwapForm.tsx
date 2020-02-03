import React from 'react';
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
import * as helpers from 'utils/helpers';
import { formNames, labels, SwapMethods } from 'stores/SwapForm';
import { validators } from '../validators';
import { useStores } from '../../contexts/storesContext';
import { ErrorCodes, ErrorIds } from '../../stores/Error';
import { ContractMetadata } from '../../stores/Token';
import { bnum, checkIsPropertyEmpty, fromWei, toWei } from 'utils/helpers';
import { BigNumber } from 'utils/bignumber';
import {
    getSupportedChainId,
    supportedNetworks,
    web3ContextNames,
} from '../../provider/connectors';

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

enum ButtonState {
    NO_WALLET,
    UNLOCK,
    SWAP,
}

const ButtonText = ['Connect Wallet', 'Unlock', 'Swap'];

const SwapForm = observer(({ tokenIn, tokenOut }) => {
    const [modelOpen, setModalOpen] = React.useState({
        state: false,
        input: 'inputAmount',
    });
    const [tradeCompositionOpen, setTradeCompositionOpen] = React.useState(
        false
    );
    const [slippageSelectorOpen, setSlippageSelectorOpen] = React.useState(
        false
    );

    const {
        root: {
            proxyStore,
            swapFormStore,
            providerStore,
            tokenStore,
            errorStore,
            modalStore,
        },
    } = useStores();

    const supportedChainId = getSupportedChainId();

    const { chainId, account } = providerStore.getActiveWeb3React();
    const { chainId: injectedChainId } = providerStore.getWeb3React(
        web3ContextNames.injected
    );

    if (!chainId) {
        // Review error message
        throw new Error('ChainId not loaded in TestPanel');
    }

    const { inputs, outputs } = swapFormStore;
    const tokenList = tokenStore.getWhitelistedTokenMetadata(supportedChainId);

    // TODO set default inputToken and outputToken to ETH and DAI (or was it token with highest user balance??)
    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
        swapFormStore.inputs.inputToken = tokenList[0].address;
        swapFormStore.inputs.inputTicker = tokenList[0].symbol;
        swapFormStore.inputs.inputIconAddress = tokenList[0].iconAddress;
        swapFormStore.inputs.inputPrecision = tokenList[0].precision;
    }

    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
        swapFormStore.inputs.outputToken = tokenList[1].address;
        swapFormStore.inputs.outputTicker = tokenList[1].symbol;
        swapFormStore.inputs.outputIconAddress = tokenList[1].iconAddress;
        swapFormStore.inputs.outputPrecision = tokenList[1].precision;
    }

    const {
        inputToken,
        inputTicker,
        inputIconAddress,
        inputPrecision,
        outputToken,
        outputTicker,
        outputIconAddress,
        outputPrecision,
        expectedSlippage,
    } = inputs;

    const buttonActionHandler = (buttonState: ButtonState) => {
        switch (buttonState) {
            case ButtonState.NO_WALLET:
                modalStore.toggleWalletModal();
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
        const proxyAddress = tokenStore.getProxyAddress(supportedNetworks[0]);
        await tokenStore.approveMax(tokenToUnlock, proxyAddress);
    };

    const swapHandler = async () => {
        if (!outputs.validSwap) {
            return;
        }

        if (inputs.type === SwapMethods.EXACT_IN) {
            const {
                inputAmount,
                inputToken,
                outputToken,
                outputLimit,
                limitPrice,
                swaps,
            } = inputs;
            await proxyStore.batchSwapExactIn(
                swaps,
                inputToken,
                toWei(inputAmount),
                outputToken,
                toWei(outputLimit),
                toWei(limitPrice)
            );
        } else if (inputs.type === SwapMethods.EXACT_OUT) {
            const {
                inputLimit,
                inputToken,
                outputToken,
                outputAmount,
                limitPrice,
                swaps,
            } = inputs;
            await proxyStore.batchSwapExactOut(
                swaps,
                inputToken,
                toWei(inputLimit),
                outputToken,
                toWei(outputAmount),
                toWei(limitPrice)
            );
        }
    };

    const getButtonState = (
        account,
        userAllowance: BigNumber | undefined
    ): ButtonState => {
        const validInput = swapFormStore.isValidInput(inputs.inputAmount);
        const sufficientAllowance = userAllowance && userAllowance.gt(0);

        if (account) {
            if (!sufficientAllowance) {
                return ButtonState.UNLOCK;
            }
            return ButtonState.SWAP;
        }

        if (injectedChainId && injectedChainId !== supportedChainId) {
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

        if (
            buttonState === ButtonState.UNLOCK ||
            buttonState === ButtonState.NO_WALLET
        ) {
            return true;
        }

        if (buttonState === ButtonState.SWAP) {
            if (
                isInputValid &&
                injectedChainId &&
                injectedChainId === supportedChainId
            ) {
                const inputAmountBN = toWei(inputs.inputAmount);
                return inputBalance && inputBalance.gte(inputAmountBN);
            }
        }

        return false;
    };

    let inputUserBalanceBN;
    let inputUserBalance;
    let truncatedInputUserBalance = '0.00';
    let outputUserBalanceBN;
    let outputUserBalance;
    let truncatedOutputUserBalance = '0.00';
    let userAllowance;

    if (account) {
        inputUserBalanceBN = tokenStore.getBalance(
            chainId,
            inputToken,
            account
        );

        if (inputUserBalanceBN) {
            inputUserBalance = (inputUserBalanceBN > 0)
                ? helpers.fromWei(inputUserBalanceBN)
                : '0.00';
            let inputBalanceParts = inputUserBalance.split(".");
            if (inputBalanceParts[1].substring(0,8).length > 1) {
                inputUserBalance = inputBalanceParts[0] + "." + inputBalanceParts[1].substring(0, inputPrecision);
            } else {
                inputUserBalance = inputBalanceParts[0] + "." + inputBalanceParts[1].substring(0, 1) + "0"
            }
            if (inputUserBalance.length > 20) {
                truncatedInputUserBalance =
                    inputUserBalance.substring(0, 20) + '...';
            } else {
                truncatedInputUserBalance = inputUserBalance;
            }
        }

        outputUserBalanceBN = tokenStore.getBalance(
            chainId,
            outputToken,
            account
        );

        if (outputUserBalanceBN) {
            outputUserBalance = (outputUserBalanceBN > 0)
                ? helpers.fromWei(outputUserBalanceBN).toString()
                : '0.00';
            let outputBalanceParts = outputUserBalance.split(".");
            if (outputBalanceParts[1].substring(0,8).length > 1) {
                outputUserBalance = outputBalanceParts[0] + "." + outputBalanceParts[1].substring(0, outputPrecision);
            } else {
                outputUserBalance = outputBalanceParts[0] + "." + outputBalanceParts[1].substring(0, 1) + "0"
            }
            if (outputUserBalance.length > 20) {
                truncatedOutputUserBalance =
                    outputUserBalance.substring(0, 20) + '...';
            } else {
                truncatedOutputUserBalance = outputUserBalance;
            }
        }

        const proxyAddress = tokenStore.getProxyAddress(supportedNetworks[0]);
        userAllowance = tokenStore.getAllowance(
            chainId,
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
    let errorMessage;
    errorMessage = inputs.activeErrorMessage;

    return (
        <div>
            <AssetSelector modelOpen={modelOpen} setModalOpen={setModalOpen} />
            <RowContainer>
                <SellToken
                    key="122"
                    inputID="amount-in"
                    inputName="inputAmount"
                    setModalOpen={setModalOpen}
                    tokenName={inputTicker}
                    tokenBalance={inputUserBalance}
                    truncatedTokenBalance={truncatedInputUserBalance}
                    tokenAddress={inputIconAddress}
                    errorMessage={errorMessage}
                    showMax={!!account && !!inputUserBalanceBN}
                />
                <Switch />
                <BuyToken
                    key="123"
                    inputID="amount-out"
                    inputName="outputAmount"
                    setModalOpen={setModalOpen}
                    tokenName={outputTicker}
                    tokenBalance={outputUserBalance}
                    truncatedTokenBalance={truncatedOutputUserBalance}
                    tokenAddress={outputIconAddress}
                    errorMessage={errorMessage}
                    showMax={!!account && !!outputUserBalanceBN}
                />
            </RowContainer>
            <ColumnContainer>
                <TradeComposition
                    tradeCompositionOpen={tradeCompositionOpen}
                    setTradeCompositionOpen={setTradeCompositionOpen}
                />
                <ErrorDisplay errorText={errorMessage} />
                <SlippageSelector
                    expectedSlippage={expectedSlippage}
                    slippageSelectorOpen={slippageSelectorOpen}
                    setSlippageSelectorOpen={setSlippageSelectorOpen}
                />
                <Button
                    buttonText={getButtonText(buttonState)}
                    active={getButtonActive(buttonState, inputUserBalanceBN)}
                    onClick={() => {
                        buttonActionHandler(buttonState);
                    }}
                />
            </ColumnContainer>
        </div>
    );
});

export default SwapForm;
