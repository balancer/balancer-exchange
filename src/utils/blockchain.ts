// Utils
import web3 from './web3';
import { promisify } from 'util';

export const schema = {
    BPool: require('../abi/BPool'),
    BFactory: require('../abi/BFactory'),
    TestToken: require('../abi/TestToken'),
    ExchangeProxy: require('../abi/ExchangeProxy'),
};

export const objects = {};

export const getAccounts = () => {
    return promisify(web3.eth.getAccounts)();
};

export const loadObject = (type, address, label = null) => {
    const object = new web3.eth.Contract(schema[type].abi, address, {
        from: getDefaultAccount(),
    });
    if (label) {
        objects[label] = object;
    }
    return object;
};

export const getDefaultAccount = () => {
    return web3.eth.defaultAccount;
};

export const getDefaultAccountByIndex = (index): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            const accounts = await getAccounts();
            resolve(accounts[index]);
        } catch (e) {
            reject(new Error(e));
        }
    });
};

export const setDefaultAccount = account => {
    web3.eth.defaultAccount = account;
    console.log(`Address ${account} loaded`);
};

export const setWebClientProvider = () => {
    return web3.setWebClientProvider();
};
