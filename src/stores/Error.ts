import { action, observable } from 'mobx';
import RootStore from 'stores/Root';

export enum ErrorIds {
    SWAP_FORM_STORE,
}

export enum ErrorCodes {
    NO_ERROR,
    GENERIC_TX_FAILURE,
    BALANCER_MAX_RATIO_IN,
    NO_WALLET_FOUND,
    INSUFFICIENT_BALANCE_FOR_SWAP,
    INSUFFICIENT_APPROVAL_FOR_SWAP,
}

export const ERROR_MESSAGES = [
    'No Error',
    'Transaction Failed',
    'Balancer Max in Ratio',
    'No Ethereum wallet found',
    'Insufficient Balance',
    'Enable Input Token',
];

export interface BalancerError {
    code: ErrorCodes;
    message: string;
}

interface BalancerErrorMap {
    [index: number]: BalancerError | undefined;
}

export default class ErrorStore {
    rootStore: RootStore;
    @observable activeErrors: BalancerErrorMap;

    constructor(rootStore) {
        this.activeErrors = {} as BalancerErrorMap;
        this.rootStore = rootStore;
    }

    getActiveError(id: ErrorIds): BalancerError | undefined {
        return this.activeErrors[id];
    }

    @action setActiveError(id: ErrorIds, code: ErrorCodes) {
        if (code === ErrorCodes.NO_ERROR) {
            this.activeErrors[id] = undefined;
        } else {
            this.activeErrors[id] = {
                code,
                message: ERROR_MESSAGES[code],
            };
        }
    }
}
