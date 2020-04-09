import { BigNumber } from 'utils/bignumber';
import { ValidationStatus } from './stores/actions/validators';

export interface BigNumberMap {
    [index: string]: BigNumber;
}

export interface StringMap {
    [index: string]: string;
}

export interface NumberMap {
    [index: string]: number;
}

// Token Address -> checked
export interface CheckboxMap {
    [index: string]: Checkbox;
}

// Token -> amount
export interface InputMap {
    [index: string]: Input;
}

export interface Input {
    value: string;
    touched: boolean;
    validation: ValidationStatus;
}

export interface Checkbox {
    checked: boolean;
    touched: boolean;
}

export interface Swap {
    tokenIn;
    tokenInSym;
    tokenAmountIn;
    tokenOut;
    tokenOutSym;
    tokenAmountOut;
}
