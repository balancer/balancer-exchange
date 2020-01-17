import { observable, action } from 'mobx';
import RootStore from 'stores/Root';
import { ValidationRules } from 'react-form-validator-core';
import { ExactAmountInPreview, ExactAmountOutPreview, Swap } from "./Proxy";
import { BigNumber } from "utils/bignumber";
import { bnum, fromWei, scale, toWei } from "../utils/helpers";

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

export enum SwapMethods {
    EXACT_IN = 'swapExactIn',
    EXACT_OUT = 'swapExactOut',
}

export enum InputValidationStatus {
    VALID = 'Valid',
    EMPTY = 'Empty',
    ZERO = 'Zero',
    NOT_FLOAT = 'Not Float',
    NEGATIVE = 'Negative',
}

export interface ChartData {
    validSwap: boolean,
    swaps: ChartSwap[],
    inputPriceValue: BigNumber,
    outputPriceValue: BigNumber
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
        inputTicker: '',
        outputTicker: '',
        inputIconAddress: '',
        outputIconAddress: '',
        type: SwapMethods.EXACT_IN,
        outputLimit: '0',
        inputLimit: '0',
        limitPrice: '0',
        setBuyFocus: false,
        setSellFocus: false,
        effectivePrice: '',
        swaps: [],
    };
    @observable outputs = {
        inputAmount: '',
        outputAmount: '',
        effectivePrice: '',
        swaps: [],
        validSwap: false,
    };
    @observable tradeCompositionData: ChartData;

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

    /* Assume swaps are in order of biggest to smallest value */
    @action setTradeCompositionEAI(preview: ExactAmountInPreview) {
        const {inputAmount, swaps, totalOutput, effectivePrice, validSwap} = preview;
        this.setTradeComposition(SwapMethods.EXACT_IN, swaps, inputAmount, totalOutput, effectivePrice, validSwap);
    }

    /* Assume swaps are in order of biggest to smallest value */
    @action setTradeCompositionEAO(preview: ExactAmountOutPreview) {
        const {outputAmount, swaps, totalInput, effectivePrice, validSwap} = preview;
        this.setTradeComposition(SwapMethods.EXACT_OUT, swaps, outputAmount, totalInput, effectivePrice, validSwap);
    }

    @action private setTradeComposition(method: SwapMethods, swaps: Swap[], inputValue: BigNumber, totalValue: BigNumber, effectivePrice: BigNumber, validSwap: boolean) {
        let result: ChartData = {
            validSwap: true,
            inputPriceValue: bnum(0),
            outputPriceValue: bnum(0),
            swaps: []
        };

        if (!validSwap) {
            result.validSwap = false;
            this.tradeCompositionData = result;
        }

        const others: ChartSwap = {
            isOthers: true,
            percentage: 0
        };

        const tempChartSwaps: ChartSwap[] = [];
        // Convert all Swaps to ChartSwaps
        swaps.forEach(value => {
            const swapValue = method === SwapMethods.EXACT_IN ? value[1] : value[2];

            tempChartSwaps.push({
                isOthers: false,
                poolAddress: value[0],
                percentage: bnum(swapValue).div(toWei(inputValue)).times(100).toNumber()
            })
        });

        tempChartSwaps.forEach((value, index) => {
            if (index === 0 || index === 1) {
                result.swaps.push(value);
            } else {
                others.percentage += value.percentage;
            }
        });

        if (others.percentage > 0) {
            result.swaps.push(others);
        }

        if (method === SwapMethods.EXACT_IN) {
            result.inputPriceValue = inputValue;
            result.outputPriceValue = bnum(fromWei(totalValue));
        }

        if (method === SwapMethods.EXACT_OUT) {
            result.inputPriceValue = bnum(fromWei(totalValue));
            result.outputPriceValue = inputValue;
        }

        this.tradeCompositionData = result;
    }

    isValidInput(value: string): boolean {
        return this.getSwapFormInputValidationStatus(value) === InputValidationStatus.VALID;
    }

    getSwapFormInputValidationStatus(value: string): InputValidationStatus {
        if (ValidationRules.isEmpty(value)) {
            return InputValidationStatus.EMPTY;
        }

        if (!ValidationRules.isFloat(value)) {
            return InputValidationStatus.NOT_FLOAT;
        }

        if (value === '0') {
            return InputValidationStatus.ZERO;
        }

        if (!ValidationRules.isPositive(value)) {
            return InputValidationStatus.NEGATIVE;
        }

        return InputValidationStatus.VALID;
    }

    resetInputs() {
        this.inputs = {
            ...this.inputs,
            inputAmount: '',
            outputAmount: '',
        };
    }

    resetOutputs() {
        this.outputs = {
            inputAmount: '',
            outputAmount: '',
            effectivePrice: '',
            swaps: [],
            validSwap: false,
        };
    }

    constructor(rootStore) {
        this.rootStore = rootStore;
        this.tradeCompositionData = {
            validSwap: false,
            inputPriceValue: bnum(0),
            outputPriceValue: bnum(0),
            swaps: []
        }
    }
}
