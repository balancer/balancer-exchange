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

const ButtonText = ['Connect to a wallet', 'Unlock', 'Swap'];

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

    const { chainId, account } = providerStore.getActiveWeb3React();
    const proxyAddress = tokenStore.getProxyAddress(chainId);

    if (!chainId) {
        // Review error message
        throw new Error('ChainId not loaded in TestPanel');
    }

    const { inputs, outputs } = swapFormStore;
    const {
        inputToken,
        inputTicker,
        inputIconAddress,
        outputToken,
        outputTicker,
        outputIconAddress,
    } = inputs;
    const tokenList = tokenStore.getWhitelistedTokenMetadata(chainId);

    // TODO set default inputToken and outputToken to ETH and DAI (or was it token with highest user balance??)
    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.inputToken)) {
        swapFormStore.inputs.inputToken = tokenList[0].address;
        swapFormStore.inputs.inputTicker = tokenList[0].symbol;
        swapFormStore.inputs.inputIconAddress = tokenList[0].iconAddress;
    }

    if (helpers.checkIsPropertyEmpty(swapFormStore.inputs.outputToken)) {
        swapFormStore.inputs.outputToken = tokenList[1].address;
        swapFormStore.inputs.outputTicker = tokenList[1].symbol;
        swapFormStore.inputs.outputIconAddress = tokenList[1].iconAddress;
    }

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
        await tokenStore.approveMax(tokenToUnlock, proxyAddress);
    };

    const swapHandler = async () => {
        if (!outputs.validSwap) {
            console.log('swap not valid!' + swapFormStore.outputs.validSwap);
            console.log(inputs.inputAmount);
            console.log(inputs.outputAmount);
            console.log(inputs.type);
            console.log(inputs.swaps);
            return;
        }
        console.log('swap handler executed', inputs.type);

        if (inputs.type === SwapMethods.EXACT_IN) {
            const {
                inputAmount,
                inputToken,
                outputToken,
                outputLimit,
                limitPrice,
              swaps
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
            if (isInputValid) {
                const inputAmountBN = toWei(inputs.inputAmount);
                return inputBalance && inputBalance.gte(inputAmountBN);
            }
        }

        return false;
    };

    let inputUserBalanceBN;
    let inputUserBalance;
    let outputUserBalanceBN;
    let outputUserBalance;
    let userAllowance;

    if (account) {
        inputUserBalanceBN = tokenStore.getBalance(
            chainId,
            inputToken,
            account
        );
        inputUserBalance = inputUserBalanceBN
            ? helpers.fromWei(inputUserBalanceBN).toString()
            : 'N/A';

        outputUserBalanceBN = tokenStore.getBalance(
            chainId,
            outputToken,
            account
        );
        outputUserBalance = outputUserBalanceBN
            ? helpers.fromWei(outputUserBalanceBN).toString()
            : 'N/A';

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
        console.log('error', error);
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
                    tokenAddress={inputIconAddress}
                />
                <Switch />
                <BuyToken
                    key="123"
                    inputID="amount-out"
                    inputName="outputAmount"
                    setModalOpen={setModalOpen}
                    tokenName={outputTicker}
                    tokenBalance={outputUserBalance}
                    tokenAddress={outputIconAddress}
                />
            </RowContainer>
            <ColumnContainer>
                <TradeComposition
                    tradeCompositionOpen={tradeCompositionOpen}
                    setTradeCompositionOpen={setTradeCompositionOpen}
                />
                <ErrorDisplay errorText={errorMessage} />
                <SlippageSelector
                    expectedSlippage="0.38%"
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
