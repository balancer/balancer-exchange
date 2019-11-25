import { observable, action } from 'mobx'
import * as deployed from '../deployed'

export const formNames = {
    INPUT_FORM: 'inputs'
}

export const methodNames = {
    EXACT_AMOUNT_IN: 'exactAmountIn',
    EXACT_AMOUNT_OUT: 'exactAmountOut',
    EXACT_MARGINAL_PRICE: 'exactMarginalPrice',
}

export const labels = {
    methods: {
        EXACT_AMOUNT_IN: 'Exact Amount In',
        EXACT_AMOUNT_OUT: 'Exact Amount Out',
        EXACT_MARGINAL_PRICE: 'Exact Marginal Price',
    },
    inputs: {
        INPUT_TOKEN: 'Input Token',
        OUTPUT_TOKEN: 'Output Token',
        INPUT_AMOUNT: 'Input Amount',
        OUTPUT_AMOUNT: 'Output Amount',
        OUTPUT_LIMIT: 'Minimum Output Amount',
        INPUT_LIMIT: 'Maximum Input Amount',
        LIMIT_PRICE: 'Maximum Price',
        MARGINAL_PRICE: 'Marginal Price'
    },
    outputs: {
        INPUT_AMOUNT: 'Input Amount',
        OUTPUT_AMOUNT: 'Output Amount',
        EFFECTIVE_PRICE: 'Effective Price',
        MARGINAL_PRICE: 'Marginal Price'
    }
}

export default class SwapFormStore {
    @observable swapMethod = methodNames.EXACT_AMOUNT_IN
    @observable inputs = {
        inputToken: '',
        outputtoken: '',
        inputAmount: '',
        outputAmount: '',
        outputLimit: '',
        inputLimit: '',
        limitPrice: '',
        marginalPrice: ''
    }
    @observable outputs = {
        inputAmount: '',
        outputAmount: '',
        effectivePrice: '',
        validSwap: false
    }

    @action updateOutputsFromObject(output) {
        this.outputs = {
            ...this.outputs,
            ...output
        }
    }

    @action setSwapMethod(newSwapMethod) {
        const oldSwapMethod = this.swapMethod

        if (oldSwapMethod !== newSwapMethod) {
            this.swapMethod = newSwapMethod

            // Reset form fields when changing swap method
            this.resetInputs()
            this.resetOutputs()
        }
    }

    getTokenList = () => {
        return deployed.tokens
    }

    resetInputs() {
        this.inputs = {
            ...this.inputs,
            inputAmount: '',
            outputAmount: '',
            outputLimit: '',
            inputLimit: '',
            limitPrice: '',
            marginalPrice: ''
        }
    }

    resetOutputs() {
        this.outputs = {
            inputAmount: '',
            outputAmount: '',
            effectivePrice: ''
        }
    }

    constructor(rootStore) {
        this.rootStore = rootStore;
    }
}