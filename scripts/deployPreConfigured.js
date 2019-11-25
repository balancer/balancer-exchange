const Web3 = require('web3')
const fs = require('fs');
const schema = require('./constants').schema;

const web3 = new Web3("http://localhost:8545");
const toHex = web3.utils.toHex;
const toBN = web3.utils.toBN;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;

const MAX_GAS = require('./constants').MAX_GAS;
const MAX_UINT = require('./constants').MAX_UINT;

const params = {
    tokenParams: [
        {
            name: 'WETH',
            symbol: 'WETH',
            balance: toWei('20'),
            weight: toWei('5'),
            userBalance: toWei('100'),
            initialSupply: toWei('1000')
        },
        {
            name: 'MKR',
            symbol: 'MKR',
            balance: toWei('20'),
            weight: toWei('5'),
            userBalance: toWei('50'),
            initialSupply: toWei('350')
        },
        {
            name: 'DAI',
            symbol: 'DAI',
            balance: toWei('8000'),
            weight: toWei('5'),
            userBalance: toWei('20000'),
            initialSupply: toWei('100000')
        },
    ],
    extraTokenParams: [
        {
            name: 'TokenD',
            symbol: 'TokenD',
            userBalance: toWei('50'),
            initialSupply: toWei('200'),
        },
        {
            name: 'TokenE',
            symbol: 'TokenE',
            userBalance: toWei('24'),
            initialSupply: toWei('100'),
        },
        {
            name: 'TokenF',
            symbol: 'TokenF',
            userBalance: toWei('4000'),
            initialSupply: toWei('17000'),
        },
    ]
}

function writeConfigFile(deployed) {
    const filePath = process.cwd() + `/src/deployed.json`;

    // let config = {
    //     factoryAddress: factoryAddress,
    // };

    let data = JSON.stringify(deployed);
    fs.writeFileSync(filePath, data);
}


function printResults(deployed) {
    // That's it!
    console.log('-----------------')
    console.log('Deployed Factory      :', deployed.bFactory)
    console.log('Deployed ExchangeProxy:', deployed.proxy)
    console.log('Deployed pools : ')
    for (let i = 0; i < deployed.pools.length; i++) {
        console.log(`\t\t  ${deployed.pools[i]}`)
    }
    console.log('Tokens (pre-added) : ')
    for (let i = 0; i < deployed.tokens.length; i++) {
        console.log(`\t\t  ${deployed.tokens[i]}`)
    }
    console.log('Tokens (not added) : ')
    for (let i = 0; i < deployed.extraTokens.length; i++) {
        console.log(`\t\t  ${deployed.extraTokens[i]}`)
    }
    console.log('-----------------')
    console.log('')
}

function toChecksum(address) {
    return web3.utils.toChecksumAddress(address)
}

async function deployPreConfigured() {
    const accounts = await web3.eth.getAccounts();
    const defaultAccount = accounts[0];
    const newManager = accounts[1];
    const investor = accounts[2];
    const user = accounts[3];

    const { tokenParams, extraTokenParams } = params;

    const TestToken = new web3.eth.Contract(schema.TestToken.abi, { data: schema.TestToken.bytecode, gas: MAX_GAS, from: defaultAccount })
    const BFactory = new web3.eth.Contract(schema.BFactory.abi, { data: schema.BFactory.abi, gas: MAX_GAS, from: defaultAccount });
    const ExchangeProxy = new web3.eth.Contract(schema.ExchangeProxy.abi, { data: schema.ExchangeProxy.abi, gas: MAX_GAS, from: defaultAccount });

    let tx
    // Deploy Tokens
    let tokens = [];

    for (let i = 0; i < tokenParams.length; i++) {
        console.log(`Deploying Token ${i}...`)
        const initialSupply = tokenParams[i].initialSupply
        const token = await TestToken.deploy({
            data: schema.TestToken.bytecode,
            arguments:
                [tokenParams[i].name, tokenParams[i].symbol, 18, initialSupply]
        }).send({ gas: MAX_GAS })
        // const token = new web3.eth.Contract(abi.TestToken, tokenAddress)
        tokens.push(token);
    }

    for (let i = 0; i < tokens.length; i++) {
        console.log(`Distributing token ${i} to test accounts...`)
        const amount = tokenParams[i].userBalance
        await tokens[i].methods.transfer(newManager, amount).send()
        await tokens[i].methods.transfer(investor, amount).send()
        await tokens[i].methods.transfer(user, amount).send()
    }

    let extraTokens = [];

    for (let i = 0; i < extraTokenParams.length; i++) {
        console.log(`Deploying Extra token ${i}...`)
        const initialSupply = extraTokenParams[i].initialSupply
        const token = await TestToken.deploy({
            data: schema.TestToken.bytecode,
            arguments:
                [extraTokenParams[i].name, extraTokenParams[i].symbol, 18, initialSupply]
        }).send({ gas: MAX_GAS })
        // const token = new web3.eth.Contract(abi.TestToken, tokenAddress)
        extraTokens.push(token);
    }

    for (let i = 0; i < extraTokens.length; i++) {
        console.log(`Distributing extra token ${i} to test accounts...`)
        const amount = extraTokenParams[i].userBalance
        await extraTokens[i].methods.transfer(newManager, amount).send()
        await extraTokens[i].methods.transfer(investor, amount).send()
        await extraTokens[i].methods.transfer(user, amount).send()
    }

    // Deploy Factory
    const factory = await BFactory.deploy({ data: schema.BFactory.bytecode, }).send({ gas: MAX_GAS });

    console.log(`Deploying ExchangeProxy...`)
    const proxy = await ExchangeProxy.deploy({ data: schema.ExchangeProxy.bytecode }).send({ gas: MAX_GAS });

    // // Deploy Pools
    let numPools = 3
    let pools = []
    for (let i = 0; i <= numPools; i++) {
        console.log(`Deploying BPool...`)
        tx = await factory.methods.newBPool().send()

        const poolAddress = tx.events['LOG_NEW_POOL'].returnValues.pool
        const bpool = new web3.eth.Contract(schema.BPool.abi, poolAddress, { from: defaultAccount });
        pools.push(bpool)

            // Set Token Approvals + Bind Tokens
        for (let i = 0; i < tokens.length; i++) {
            console.log(`Approving Token ${i} to Bind...`)
            await tokens[i].methods.approve(bpool.options.address, MAX_UINT).send()
            await tokens[i].methods.approve(proxy.options.address, MAX_UINT).send()
            console.log(`Binding Token ${i} to BPool...`)
            await bpool.methods.bind(tokens[i].options.address, tokenParams[i].balance, tokenParams[i].weight).send({ gas: MAX_GAS })
        }

        console.log('Set Public Swap')

        await bpool.methods.setPublicSwap(true).send()
    }
    



    let deployed = {
        bFactory: toChecksum(factory.options.address),
        proxy: toChecksum(proxy.options.address),
        pools: [],
        tokens: [],
        extraTokens: [],
        allTokens: [],
    }

    for (let i = 0; i < pools.length; i++) {
        const checksumAddress = toChecksum(pools[i].options.address)
        deployed.pools.push(checksumAddress)
    }

    for (let i = 0; i < tokens.length; i++) {
        const symbol = await tokens[i].methods.symbol().call()
        const checksumAddress = toChecksum(tokens[i].options.address)
        deployed.tokens.push({ symbol: symbol, address: checksumAddress })
        deployed.allTokens.push({ symbol: symbol, address: checksumAddress })
    }

    for (let i = 0; i < extraTokens.length; i++) {
        const symbol = await extraTokens[i].methods.symbol().call()
        const checksumAddress = toChecksum(extraTokens[i].options.address)
        deployed.extraTokens.push({ symbol: symbol, address: checksumAddress })
        deployed.allTokens.push({ symbol: symbol, address: checksumAddress })
    }

    printResults(deployed)
    writeConfigFile(deployed);
    console.log('Deployed factory address written to config file')
}

function main() {
    deployPreConfigured();
}

main();
