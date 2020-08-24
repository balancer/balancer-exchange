import {
    backupUrls,
    supportedChainId,
    web3Modal,
} from '../provider/connectors';
import { ethers, utils } from 'ethers';

let web3 = new ethers.providers.JsonRpcProvider(backupUrls[supportedChainId]);

// This is taken from TokenPanel.tsx. Imports of existing files for test not always working so dirty fix.
export const TokenIconAddress = address => {
    if (address === 'ether') {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png`;
    } else if (address === 'unknown') {
        return './empty-token.png';
    } else {
        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
    }
};

test('network sanity check', async () => {
    let network = await web3.getNetwork();
    expect(network.chainId).toEqual(42);
});

test('Confirm correct on-chain data DAI (18 decimals)', async () => {
    const abi = require('../abi/TestToken').abi;
    const daiKovanAddr = '0x1528F3FCc26d13F7079325Fb78D9442607781c8C';

    const tokenContract = new ethers.Contract(daiKovanAddr, abi, web3);

    const tokenSymbol = await tokenContract.symbol();
    const tokenDecimals = await tokenContract.decimals();

    expect(tokenSymbol).toEqual('DAI');
    expect(tokenDecimals).toEqual(18);
});

test('Confirm correct on-chain data USDC (6 decimals)', async () => {
    const abi = require('../abi/TestToken').abi;
    const usdcKovanAddr = '0x2F375e94FC336Cdec2Dc0cCB5277FE59CBf1cAe5';

    const tokenContract = new ethers.Contract(usdcKovanAddr, abi, web3);

    const tokenSymbol = await tokenContract.symbol();
    const tokenDecimals = await tokenContract.decimals();

    expect(tokenSymbol).toEqual('USDC');
    expect(tokenDecimals).toEqual(6);
});

test('Confirm checksum address conversion', async () => {
    const nonCheckSumAddr = '0xd115bffabbdd893a6f7cea402e7338643ced44a6';

    const checkSumAddr = utils.getAddress(nonCheckSumAddr);

    expect(checkSumAddr).toEqual('0xD115BFFAbbdd893A6f7ceA402e7338643Ced44a6');
    expect(nonCheckSumAddr).not.toBe(
        '0xD115BFFAbbdd893A6f7ceA402e7338643Ced44a6'
    );
});

test('Invalid checksum address conversion', async () => {
    const nonCheckSumAddr = '0xD115BFfabbdd893a6f7cea402E7338643ced44a6';
    let checkSumAddr;
    try {
        checkSumAddr = utils.getAddress(nonCheckSumAddr);
    } catch {
        checkSumAddr = false;
    }

    expect(checkSumAddr).toEqual(false);
});

test('Confirm correct DAI icon retrival', async () => {
    const nonCheckSumAddr = '0x6b175474e89094c44da98b954eedeac495271d0f';
    const checkSumAddr = utils.getAddress(nonCheckSumAddr);

    const iconAddress = TokenIconAddress(checkSumAddr);
    console.log(iconAddress);
    expect(iconAddress).toEqual(
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png'
    );
});
