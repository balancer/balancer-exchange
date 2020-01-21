import { BigNumber } from 'bignumber.js';
BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: 1,
});

export { BigNumber };
