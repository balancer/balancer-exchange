export enum ERROR_CODES {
    GENERIC_TX_FAILURE,
    BALANCER_MAX_RATIO_IN,
}

export const ERRORS = {
    GENERIC_TX_FAILURE: {
        code: ERROR_CODES.GENERIC_TX_FAILURE,
        message: 'Transaction Failed',
    },
};
