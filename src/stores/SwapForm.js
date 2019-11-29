import { observable, action } from 'mobx'
import * as deployed from '../deployed'

export const formNames = {
    INPUT_FORM: 'inputs'
}

export const methodNames = {
    EXACT_AMOUNT_IN: 'exactAmountIn',
    EXACT_AMOUNT_OUT: 'exactAmountOut'
}

export const labels = {
    methods: {
        EXACT_AMOUNT_IN: 'Exact Amount In',
        EXACT_AMOUNT_OUT: 'Exact Amount Out'
    },
    inputs: {
        INPUT_TOKEN: 'Input Token',
        OUTPUT_TOKEN: 'Output Token',
        INPUT_AMOUNT: 'Input Amount',
        OUTPUT_AMOUNT: 'Output Amount'
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
        outputAmount: ''
    }
    @observable outputs = {
        inputAmount: '',
        outputAmount: '',
        effectivePrice: '',
        swaps: [],
        validSwap: false
    }

    @action updateOutputsFromObject(output) {
        this.outputs = {
            ...this.outputs,
            ...output
        }
    }

    getTokenList = () => {
        return deployed.tokens
    }

    resetInputs() {
        this.inputs = {
            ...this.inputs,
            inputAmount: '',
            outputAmount: ''
        }
    }

    resetOutputs() {
        this.outputs = {
            inputAmount: '',
            outputAmount: '',
            effectivePrice: '',
            swaps: []
        }
    }

    constructor(rootStore) {
        this.rootStore = rootStore;
    }
}