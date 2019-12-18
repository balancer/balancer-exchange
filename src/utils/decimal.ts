import { Decimal } from 'decimal.js';
Decimal.config({
    toExpNeg: -100,
    toExpPos: 100,
});

export {Decimal};
