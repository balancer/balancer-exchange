import React from 'react';
import { formatNumber } from "./helpers.js"

export const ERRORS = Object.freeze({
  NO_ORDERS: (tradeSide, amount, token) =>
    (
      <React.Fragment key="error">
        No orders available to {tradeSide} <span className="error-msg value" key="error-amount">{formatNumber(amount,5,false)} {token.toUpperCase()}</span>
      </React.Fragment>
    ),
  NO_GAS_FUNDS: `You will not have enough  Ether to pay for the transaction`,
  MINIMAL_VALUE: (threshold, token) => `The Minimum trade value is ${threshold} ${token.toUpperCase()}`,
  INSUFFICIENT_FUNDS: (amount, token) => `You don't have ${formatNumber(amount,5, false)} ${token.toUpperCase()} in your wallet`
});