const Web3 = require('web3');

const MAX_GAS = 0xffffffff;
const MAX_UINT = Web3.utils.toTwosComplement('-1');
const { BN } = Web3.utils;

const TEN18 = new BN('1000000000000000000');
const TEN15 = new BN('1000000000000000');
const TEN9 = new BN('1000000000');

const schema = {
    BPool: require('../src/abi/BPool'),
    BFactory: require('../src/abi/BFactory'),
    TestToken: require('../src/abi/TestToken'),
    ExchangeProxy: require('../src/abi/ExchangeProxy'),
};

module.exports = {
    MAX_GAS,
    MAX_UINT,
    schema,
    TEN18,
    TEN15,
    TEN9,
};
