import { action, observable } from 'mobx';
import RootStore from 'stores/Root';
import { ValidationRules } from 'react-form-validator-core';
import {
    ExactAmountInPreview,
    ExactAmountOutPreview,
    Swap,
    SwapPreview,
} from './Proxy';
import { BigNumber } from 'utils/bignumber';
import { bnum, scale, isEmpty, str } from '../utils/helpers';

export const formNames = {
    INPUT_FORM: 'inputs',
};

export const labels = {
    inputs: {
        INPUT_TOKEN: 'Input Token',
        OUTPUT_TOKEN: 'Output Token',
        INPUT_AMOUNT: 'Input Amount',
        OUTPUT_AMOUNT: 'Output Amount',
    },
    outputs: {
        INPUT_AMOUNT: 'Input Amount',
        OUTPUT_AMOUNT: 'Output Amount',
        EFFECTIVE_PRICE: 'Effective Price',
        MARGINAL_PRICE: 'Marginal Price',
    },
};

export enum InputFocus {
    NONE,
    BUY,
    SELL,
}

export enum SwapMethods {
    EXACT_IN = 'swapExactIn',
    EXACT_OUT = 'swapExactOut',
}

export enum SwapObjection {
    NONE = 'NONE',
    INSUFFICIENT_BALANCE = 'Insufficient Balance',
}

export enum InputValidationStatus {
    VALID = 'Valid',
    EMPTY = 'Empty',
    ZERO = 'Zero',
    NOT_FLOAT = 'Not Float',
    NEGATIVE = 'Negative',
    MAX_DIGITS_EXCEEDED = 'Maximum Digits Exceeded',
}

export interface ChartData {
    validSwap: boolean;
    swaps: ChartSwap[];
    inputPriceValue: BigNumber;
    outputPriceValue: BigNumber;
}

export interface ChartSwap {
    isOthers: boolean;
    poolAddress?: string;
    percentage: number;
}

export default class SwapFormStore {
    @observable inputs = {
        inputToken: '',
        outputToken: '',
        inputAmount: '',
        outputAmount: '',
        extraSlippageAllowance: '1.0',
        extraSlippageAllowanceErrorStatus: InputValidationStatus.VALID,
        inputTicker: '',
        outputTicker: '',
        inputDecimals: 18,
        inputPrecision: 2,
        outputDecimals: 18,
        outputPrecision: 2,
        inputIconAddress: '',
        outputIconAddress: '',
        swapMethod: SwapMethods.EXACT_IN,
        outputLimit: '0',
        inputLimit: '0',
        limitPrice: '0',
        focus: 0,
        swaps: [],
    };
    @observable outputs = {
        inputAmount: '',
        outputAmount: '',
        effectivePrice: '',
        spotPrice: '',
        expectedSlippage: '0',
        outputLimit: '',
        swaps: [],
        validSwap: false,
        activeErrorMessage: '',
        swapObjection: '',
    };
    @observable preview: SwapPreview;
    @observable tradeCompositionData: ChartData;
    @observable tradeCompositionOpen: boolean;
    @observable slippageSelectorOpen: boolean;
    @observable assetModalState = {
        open: false,
        input: 'inputAmount',
    };
    @observable assetSelectFilter: string = '';
    @observable slippageCell: number = 3;

    rootStore: RootStore;

    @action updateOutputsFromObject(output) {
        this.outputs = {
            ...this.outputs,
            ...output,
        };
    }

    @action updateInputsFromObject(output) {
        this.inputs = {
            ...this.inputs,
            ...output,
        };
    }

    @action setOutputFromPreview(
        method: SwapMethods,
        preview: ExactAmountInPreview | ExactAmountOutPreview,
        decimals: number
    ) {
        if (method === SwapMethods.EXACT_IN) {
            preview = preview as ExactAmountInPreview;
            this.inputs.outputAmount = scale(
                preview.totalOutput,
                -decimals
            ).toString();
        } else if (method === SwapMethods.EXACT_OUT) {
            preview = preview as ExactAmountOutPreview;
            this.inputs.inputAmount = scale(
                preview.totalInput,
                -decimals
            ).toString();
        } else {
            throw new Error('Invalid swap method specified');
        }

        this.preview = preview;

        this.outputs = {
            ...this.outputs,
            effectivePrice: str(preview.effectivePrice),
            spotPrice: str(preview.spotPrice),
            expectedSlippage: str(preview.expectedSlippage),
            swaps: preview.swaps,
            validSwap: true,
        };
    }

    getInputFocus() {
        return this.inputs.focus;
    }

    @action switchInputFocus() {
        const inputFocus = this.getInputFocus();
        if (inputFocus === InputFocus.BUY) {
            this.setInputFocus(InputFocus.SELL);
        } else if (inputFocus === InputFocus.SELL) {
            this.setInputFocus(InputFocus.BUY);
        } else {
            throw new Error('Invalid input focus specified');
        }
    }

    @action switchSwapMethod() {
        const { swapMethod } = this.inputs;
        if (swapMethod === SwapMethods.EXACT_IN) {
            this.inputs.swapMethod = SwapMethods.EXACT_OUT;
        } else {
            this.inputs.swapMethod = SwapMethods.EXACT_IN;
        }
    }

    @action setInputFocus(element: InputFocus) {
        this.inputs.focus = element;
    }

    @action setSwapObjection(message: string) {
        this.outputs.swapObjection = message;
    }

    @action setErrorMessage(message: string) {
        this.outputs.activeErrorMessage = message;
    }

    hasErrorMessage(): boolean {
        return !isEmpty(this.outputs.activeErrorMessage);
    }

    getErrorMessage(): string {
        return this.outputs.activeErrorMessage;
    }

    isValidStatus(value: InputValidationStatus) {
        return value === InputValidationStatus.VALID;
    }

    getSlippageCell() {
        return this.slippageCell;
    }

    @action setSlippageCell(value: number) {
        this.slippageCell = value;
    }

    getExtraSlippageAllowance(): string {
        return this.inputs.extraSlippageAllowance;
    }

    getSlippageSelectorErrorStatus(): InputValidationStatus {
        return this.inputs.extraSlippageAllowanceErrorStatus;
    }

    async refreshExactAmountInPreview() {
        const { proxyStore, providerStore, tokenStore } = this.rootStore;
        const { account, chainId } = providerStore.getActiveWeb3React();
        const { inputToken, outputToken, inputAmount } = this.inputs;

        const preview = await proxyStore.previewBatchSwapExactIn(
            inputToken,
            outputToken,
            bnum(inputAmount),
            tokenStore.getTokenMetadata(chainId, inputToken).decimals
        );

        this.setSwapObjection(SwapObjection.NONE);

        if (preview.error) {
            this.setErrorMessage(preview.error);
        }

        if (preview.validSwap) {
            this.setOutputFromPreview(
                SwapMethods.EXACT_IN,
                preview,
                tokenStore.getTokenMetadata(chainId, outputToken).decimals
            );
            this.clearErrorMessage();

            if (account) {
                const userBalance = tokenStore.normalizeBalance(
                    tokenStore.getBalance(chainId, inputToken, account),
                    inputToken
                );

                if (userBalance) {
                    this.setSwapObjection(
                        this.findSwapObjection(
                            inputAmount,
                            account,
                            userBalance
                        )
                    );
                }
            }
            this.setTradeCompositionEAI(preview);
        } else {
            this.setValidSwap(false);
            this.resetTradeComposition();
        }
    }

    async refreshExactAmountOutPreview() {
        const { proxyStore, providerStore, tokenStore } = this.rootStore;
        const { account, chainId } = providerStore.getActiveWeb3React();
        const { inputToken, outputToken, outputAmount } = this.inputs;

        const preview = await proxyStore.previewBatchSwapExactOut(
            inputToken,
            outputToken,
            bnum(outputAmount),
            tokenStore.getTokenMetadata(chainId, outputToken).decimals
        );

        if (preview.error) {
            this.setErrorMessage(preview.error);
        }

        if (preview.validSwap) {
            this.setOutputFromPreview(
                SwapMethods.EXACT_OUT,
                preview,
                tokenStore.getTokenMetadata(chainId, inputToken).decimals
            );
            this.clearErrorMessage();

            if (account) {
                const userBalance = tokenStore.normalizeBalance(
                    tokenStore.getBalance(chainId, inputToken, account),
                    inputToken
                );

                const normalizedInput = tokenStore.normalizeBalance(
                    preview.totalInput,
                    inputToken
                );

                if (userBalance) {
                    this.setSwapObjection(
                        this.findSwapObjection(
                            normalizedInput,
                            account,
                            userBalance
                        )
                    );
                }
            }

            this.setTradeCompositionEAO(preview);
        } else {
            this.setValidSwap(false);
            this.resetTradeComposition();
        }
    }

    refreshInvalidInputAmount(value, inputStatus) {
        console.log('[Invalid Input]', inputStatus, value);
        if (value === this.inputs.inputAmount) {
            // Clear error messages on updating to empty input
            if (inputStatus === InputValidationStatus.EMPTY) {
                this.updateInputsFromObject({
                    outputAmount: '',
                });
                this.clearErrorMessage();
                this.resetTradeComposition();
            } else {
                this.updateInputsFromObject({
                    outputAmount: '',
                });
                this.setErrorMessage(inputStatus);
                this.resetTradeComposition();
            }
        }
    }

    refreshInvalidOutputAmount(value, inputStatus) {
        console.log('[Invalid Input]', inputStatus, value);
        if (value === this.inputs.outputAmount) {
            // Don't show error message on empty value
            if (inputStatus === InputValidationStatus.EMPTY) {
                this.setInputAmount('');

                this.clearErrorMessage();
                this.resetTradeComposition();
            } else {
                //Show error message on other invalid input status
                this.setInputAmount('');
                this.setErrorMessage(inputStatus);
                this.resetTradeComposition();
            }
        }
    }

    @action setExtraSlippageAllowance(value: string) {
        this.inputs.extraSlippageAllowance = value;
    }

    @action setSlippageSelectorErrorStatus(value: InputValidationStatus) {
        this.inputs.extraSlippageAllowanceErrorStatus = value;
    }

    @action clearErrorMessage() {
        this.outputs.activeErrorMessage = '';
    }

    @action setValidSwap(valid: boolean) {
        this.outputs.validSwap = valid;
    }

    @action setOutputAmount(value: string) {
        this.inputs.outputAmount = value;
    }

    @action setInputAmount(value: string) {
        this.inputs.inputAmount = value;
    }

    @action setTradeCompositionOpen(value) {
        this.tradeCompositionOpen = value;
    }

    @action setSlippageSelectorOpen(value) {
        this.slippageSelectorOpen = value;
    }

    @action setAssetModalState(value: { open?: boolean; input?: string }) {
        this.assetModalState = {
            ...this.assetModalState,
            ...value,
        };
    }

    getActiveInputValue(): string {
        const { swapMethod, inputAmount, outputAmount } = this.inputs;
        let inputValue;
        if (swapMethod === SwapMethods.EXACT_IN) {
            inputValue = inputAmount;
        } else {
            inputValue = outputAmount;
        }
        return inputValue;
    }

    @action switchInputOutputValues() {
        const {
            outputToken,
            outputTicker,
            outputIconAddress,
            outputPrecision,
            outputDecimals,
            outputAmount,
            inputToken,
            inputTicker,
            inputIconAddress,
            inputDecimals,
            inputPrecision,
            inputAmount,
        } = this.inputs;
        this.inputs.inputToken = outputToken;
        this.inputs.inputTicker = outputTicker;
        this.inputs.inputIconAddress = outputIconAddress;
        this.inputs.inputDecimals = outputDecimals;
        this.inputs.inputPrecision = outputPrecision;
        this.inputs.inputAmount = outputAmount;

        this.inputs.outputToken = inputToken;
        this.inputs.outputTicker = inputTicker;
        this.inputs.outputIconAddress = inputIconAddress;
        this.inputs.outputDecimals = inputDecimals;
        this.inputs.outputPrecision = inputPrecision;
        this.inputs.outputAmount = inputAmount;

        this.switchSwapMethod();
        this.setInputFocus(InputFocus.NONE);
    }

    @action clearInputs() {
        this.setInputAmount('');
        this.setOutputAmount('');
        this.clearErrorMessage();
    }

    @action setAssetSelectFilter(value: string) {
        this.assetSelectFilter = value;
    }

    isInputAmountStale(inputAmount: string | BigNumber) {
        let storedAmount = this.inputs.inputAmount;
        if (storedAmount.substr(0, 1) === '.') {
            storedAmount = '0' + storedAmount;
        }
        return inputAmount.toString() !== storedAmount;
    }

    isOutputAmountStale(outputAmount: string | BigNumber) {
        let storedAmount = this.inputs.outputAmount;
        if (storedAmount.substr(0, 1) === '.') {
            storedAmount = '0' + storedAmount;
        }
        return outputAmount.toString() !== storedAmount;
    }

    /* Assume swaps are in order of biggest to smallest value */
    @action setTradeCompositionEAI(preview: ExactAmountInPreview) {
        const {
            tokenAmountIn,
            swaps,
            totalOutput,
            effectivePrice,
            validSwap,
        } = preview;
        this.setTradeComposition(
            SwapMethods.EXACT_IN,
            swaps,
            tokenAmountIn,
            totalOutput,
            effectivePrice,
            validSwap
        );
    }

    /* Assume swaps are in order of biggest to smallest value */
    @action setTradeCompositionEAO(preview: ExactAmountOutPreview) {
        const {
            tokenAmountOut,
            swaps,
            totalInput,
            effectivePrice,
            validSwap,
        } = preview;
        this.setTradeComposition(
            SwapMethods.EXACT_OUT,
            swaps,
            tokenAmountOut,
            totalInput,
            effectivePrice,
            validSwap
        );
    }

    @action private setTradeComposition(
        method: SwapMethods,
        swaps: Swap[],
        inputValue: BigNumber,
        totalValue: BigNumber,
        effectivePrice: BigNumber,
        validSwap: boolean
    ) {
        let result: ChartData = {
            validSwap: true,
            inputPriceValue: bnum(0),
            outputPriceValue: bnum(0),
            swaps: [],
        };

        if (!validSwap) {
            result.validSwap = false;
            this.tradeCompositionData = result;
        }

        const others: ChartSwap = {
            isOthers: true,
            percentage: 0,
        };

        const tempChartSwaps: ChartSwap[] = [];
        // Convert all Swaps to ChartSwaps
        swaps.forEach(value => {
            const swapValue =
                method === SwapMethods.EXACT_IN
                    ? value.tokenInParam
                    : value.tokenOutParam;

            tempChartSwaps.push({
                isOthers: false,
                poolAddress: value.pool,
                percentage: bnum(swapValue)
                    .div(inputValue)
                    .times(100)
                    .dp(2, BigNumber.ROUND_HALF_EVEN)
                    .toNumber(),
            });
        });

        let totalPercentage = 0;

        tempChartSwaps.forEach((value, index) => {
            if (index === 0 || index === 1 || index === 2) {
                result.swaps.push(value);
            } else {
                others.percentage += value.percentage;
            }

            totalPercentage += value.percentage;
        });

        if (others.percentage > 0) {
            result.swaps.push(others);
        }

        if (method === SwapMethods.EXACT_IN) {
            result.inputPriceValue = inputValue;
            result.outputPriceValue = totalValue;
        }

        if (method === SwapMethods.EXACT_OUT) {
            result.inputPriceValue = totalValue;
            result.outputPriceValue = inputValue;
        }

        if (totalPercentage !== 100) {
            console.log(totalPercentage);
            console.error('Total Percentage Unexpected Value');
        }

        this.tradeCompositionData = result;
    }

    @action async refreshSwapFormPreviewEAI(amount: string) {
        this.inputs.swapMethod = SwapMethods.EXACT_IN;
        this.inputs.inputAmount = amount;

        const inputStatus = this.validateSwapValue(amount);

        if (inputStatus === InputValidationStatus.VALID) {
            await this.refreshExactAmountInPreview();
        } else {
            this.refreshInvalidInputAmount(amount, inputStatus);
        }
    }

    @action async refreshSwapFormPreviewEAO(amount: string) {
        this.inputs.swapMethod = SwapMethods.EXACT_OUT;
        this.inputs.outputAmount = amount;

        const inputStatus = this.validateSwapValue(amount);

        if (inputStatus === InputValidationStatus.VALID) {
            await this.refreshExactAmountOutPreview();
        } else {
            this.refreshInvalidOutputAmount(amount, inputStatus);
        }
    }

    @action async refreshSwapFormPreview(
        amount: string,
        swapMethod: SwapMethods
    ) {
        if (swapMethod === SwapMethods.EXACT_IN) {
            this.refreshSwapFormPreviewEAI(amount);
        } else if (swapMethod === SwapMethods.EXACT_OUT) {
            this.refreshSwapFormPreviewEAO(amount);
        } else {
            throw new Error('Invalid swap method specified');
        }
    }

    @action clearTradeComposition() {
        this.resetTradeComposition();
    }

    isValidInput(value: string): boolean {
        return (
            this.getNumberInputValidationStatus(value) ===
            InputValidationStatus.VALID
        );
    }

    findSwapObjection(
        value: string,
        account: string | undefined,
        normalizedBalance: string
    ): SwapObjection {
        console.log('swapObjection', {
            value,
            account,
            normalizedBalance,
        });
        // Check for insufficient balance if user logged in
        if (account && parseFloat(value) > parseFloat(normalizedBalance)) {
            return SwapObjection.INSUFFICIENT_BALANCE;
        }

        return SwapObjection.NONE;
    }

    validateSwapValue(value: string): InputValidationStatus {
        return this.getNumberInputValidationStatus(value);
    }

    getNumberInputValidationStatus(
        value: string,
        options?: {
            limitDigits?: boolean;
        }
    ): InputValidationStatus {
        if (value.substr(0, 1) === '.') {
            value = '0' + value;
        }

        if (ValidationRules.isEmpty(value)) {
            return InputValidationStatus.EMPTY;
        }

        if (!ValidationRules.isFloat(value)) {
            return InputValidationStatus.NOT_FLOAT;
        }

        if (parseFloat(value).toString() === '0') {
            return InputValidationStatus.ZERO;
        }

        if (!ValidationRules.isPositive(value)) {
            return InputValidationStatus.NEGATIVE;
        }

        if (options && options.limitDigits) {
            // restrict to 2 decimal places
            const acceptableValues = [/^$/, /^\d{1,2}$/, /^\d{0,2}\.\d{0,2}$/];
            // if its within accepted decimal limit, update the input state
            if (!acceptableValues.some(a => a.test(value))) {
                return InputValidationStatus.MAX_DIGITS_EXCEEDED;
            }
        }

        return InputValidationStatus.VALID;
    }

    resetTradeComposition() {
        this.tradeCompositionData = {
            validSwap: false,
            inputPriceValue: bnum(0),
            outputPriceValue: bnum(0),
            swaps: [],
        };
    }

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.resetTradeComposition();
    }
}
