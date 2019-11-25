const Web3 = require('web3')
const { schema, MAX_GAS, TEN18, TEN15, TEN9 } = require('./constants');

const web3 = new Web3("http://localhost:8545");
const { BN } = web3.utils

const addresses = {
    BPool: '0x2a8AbEDeaAEE2fb1502ED9Ec0C47ed8670B2e948',
    Ti: '0x0DB84570A89A95d91eB331f8248fEeba8491cd04',
    To: '0xfa0186102A9c16f4515E984AEc687ddF1767FF84'
}

async function test() {
    const accounts = await web3.eth.getAccounts();
    const defaultAccount = accounts[1];

    const Ti = new web3.eth.Contract(schema.TestToken.abi, addresses.Ti, { from: defaultAccount })
    const To = new web3.eth.Contract(schema.TestToken.abi, addresses.To, { from: defaultAccount })
    const bPool = new web3.eth.Contract(schema.BPool.abi, addresses.BPool, { from: defaultAccount })

    // Set Initial Pool Params

    const Ai = new BN(10).mul(TEN18)
    const Lo = new BN(0).mul(TEN18)
    // const LP = new BN(TEN9).mul(TEN18)
    const LP = new BN('115792089237316195423570985008687907853269984665640564039457584007913129639935000000000000000000')

    let result

    // MATH
    const UserBalanceI = new BN(await Ti.methods.balanceOf(defaultAccount).call())
    const UserBalanceO = new BN(await To.methods.balanceOf(defaultAccount).call())

    const Bi = new BN(await Ti.methods.balanceOf(bPool.options.address).call())
    const Bo = new BN(await To.methods.balanceOf(bPool.options.address).call())
    const Wi = new BN(await bPool.methods.getNormalizedWeight(Ti.options.address).call())
    const Wo = new BN(await bPool.methods.getNormalizedWeight(To.options.address).call())

    console.log('_swap_ExactAmountIn_')

    console.log('Initial State :')
    console.log('------------------')
    console.log('User Balance (Ti): ', UserBalanceI.toString())
    console.log('User Balance (To): ', UserBalanceO.toString())
    console.log('')
    console.log('Pool Balance (Ti): ', Bi.toString())
    console.log('Pool Balance (To): ', Bo.toString())
    console.log('')
    console.log('Wi               : ', Wi.toString())
    console.log('Wo:              : ', Wo.toString())
    console.log('')

    console.log('Swap Parameters :')
    console.log('------------------')
    console.log('Ai               : ', Ai.toString())
    console.log('Lo               : ', Lo.toString())
    console.log('LP               : ', LP.toString())
    console.log('')

    try {
        const result = await bPool.methods.swap_ExactAmountIn(addresses.To, Ai.toString(), addresses.To, Lo.toString(), LP.toString()).send({ from: defaultAccount, gas: MAX_GAS })

        console.log('Transaction Result :')
        console.log('------------------')
        console.log('Amount In        : ', result.events['LOG_SWAP'].returnValues.amountIn)
        console.log('Amount Out       : ', result.events['LOG_SWAP'].returnValues.amountOut)
        console.log('')
    } catch (e) {
        console.log(result)
        console.log(e)
    }

    const UserBalanceI2 = new BN(await Ti.methods.balanceOf(defaultAccount).call())
    const UserBalanceO2 = new BN(await To.methods.balanceOf(defaultAccount).call())

    const Bi2 = new BN(await Ti.methods.balanceOf(bPool.options.address).call())
    const Bo2 = new BN(await To.methods.balanceOf(bPool.options.address).call())

    console.log('After State :')
    console.log('------------------')
    console.log('User Balance (Ti): ', UserBalanceI2.toString())
    console.log('User Balance (To): ', UserBalanceO2.toString())
    console.log('')
    console.log('Pool Balance (Ti): ', Bi2.toString())
    console.log('Pool Balance (To): ', Bo2.toString())
    console.log('')
}

function main() {
    test();
}

main();
