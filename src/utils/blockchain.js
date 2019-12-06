// Libraries
import Promise from "bluebird";

// Utils
import web3 from "./web3";

const promisify = Promise.promisify;

export const schema = {
    BPool: require('../abi/BPool'),
    BFactory: require('../abi/BFactory'),
    TestToken: require('../abi/TestToken'),
    ExchangeProxy: require('../abi/ExchangeProxy')
}

export const objects = {}

export const getAccounts = () => {
  return promisify(web3.eth.getAccounts)();
}

export const loadObject = (type, address, label = null) => {
  const object = new web3.eth.Contract(schema[type].abi, address, { from: getDefaultAccount() });
  if (label) {
    objects[label] = object;
  }
  return object;
}

export const getDefaultAccount = () => {
  return web3.eth.defaultAccount;
}

export const getCurrentProviderName = () => {
  return web3.currentProvider.name;
}

export const getDefaultAccountByIndex = index => {
  return new Promise(async (resolve, reject) => {
    try {
      const accounts = await getAccounts();
      resolve(accounts[index]);
    } catch (e) {
      reject(new Error(e));
    }
  });
}

export const setDefaultAccount = account => {
  web3.eth.defaultAccount = account;
  console.log(`Address ${account} loaded`);
}

export const getNetwork = () => {
  return promisify(web3.version.getNetwork)();
}

export const getGasPrice = () => {
  return promisify(web3.eth.getGasPrice)();
}

export const estimateGas = (to, data, value, from) => {
  return promisify(web3.eth.estimateGas)({ to, data, value, from });
}

export const getTransaction = tx => {
  return promisify(web3.eth.getTransaction)(tx);
}

export const getTransactionReceipt = tx => {
  return promisify(web3.eth.getTransactionReceipt)(tx);
}

export const getTransactionCount = address => {
  return promisify(web3.eth.getTransactionCount)(address, "pending");
}

export const getNode = () => {
  return promisify(web3.version.getNode)();
}

export const getBlock = block => {
  return promisify(web3.eth.getBlock)(block);
}

export const setFilter = (fromBlock, address) => {
  return new Promise((resolve, reject) => {
    web3.eth.filter({ fromBlock, address }).get((e, r) => {
      if (!e) {
        resolve(r);
      } else {
        reject(e);
      }
    })
  })
}

export const resetFilters = bool => {
  web3.reset(bool);
}

export const fetchBalanceOf = (token, address) => {
  if (token === 'eth') {
    return getEthBalanceOf(address);
  } else {
    return getTokenBalanceOf(token, address);
  }
}


export const getEthBalanceOf = addr => {
  return promisify(web3.eth.getBalance)(addr);
}

export const getTokenBalanceOf = (token, addr) => {
  return promisify(objects[token].balanceOf)(addr);
}

export const getTokenAllowance = (token, from, to) => {
  return promisify(objects[token].allowance.call)(from, to);
}

export const setTokenAllowance = (token, to, allowedAmount) => {
  return new Promise((resolve, reject) => {
    objects[token].approve.sendTransaction(to, allowedAmount, {}, (e, tx) => {
      if (!e) {
        const pending_token_allowance = setInterval(async () => {
          const receipt = await getTransactionReceipt(tx);
          if (receipt) {
            if (receipt.status === "0x1") {
              resolve();
            } else {
              reject();
            }
            clearInterval(pending_token_allowance);
          }
        }, 1000);
      } else {
        reject(e);
      }
    });
  });
}

export const getTokenTrusted = (token, from, to) => {
  return promisify(objects[token].allowance.call)(from, to)
    .then((result) => result.eq(web3.toBN(2).pow(256).minus(1)));
}

export function isEmptyProxy(address) {
  return !address || address === "0x0000000000000000000000000000000000000000" || address === "0x0" || address === "0x"
}

export const getProxy = account => {
  return promisify(objects.proxyRegistry.proxies)(account).then(r => isEmptyProxy(r) ? null : getProxyOwner(r).then(r2 => r2 === account ? r : null));
}

/*
   On the contract side, there is a mapping (address) -> []DsProxy
   A given address can have multiple proxies. Since lists cannot be
   iterated, the way to access a give element is access it by index
 */
export const legacy_getProxy = (registry, account, proxyIndex) => {
  return promisify(registry.proxies)(account, proxyIndex);
}

export const getProxyOwner = proxy => {
  return promisify(loadObject("dsproxy", proxy).owner)();
}

export const isMetamask = () => web3.currentProvider.isMetaMask || web3.currentProvider.constructor.name === "MetamaskInpageProvider";

export const stopProvider = () => {
  web3.stop();
}

export const setHWProvider = (device, network, path, accountsOffset = 0, accountsLength = 1) => {
  return web3.setHWProvider(device, network, path, accountsOffset, accountsLength);
}

export const setWebClientProvider = () => {
  return web3.setWebClientProvider();
}

export const checkNetwork = (actualIsConnected, actualNetwork) => {
  return new Promise((resolve, reject) => {
    let isConnected = null;
    getNode().then(r => {
      isConnected = true;
      getBlock("latest").then(res => {
        if (res && res.number >= this.latestBlock) {
          resolve({
            status: 0,
            data: {
              latestBlock: res.number,
              outOfSync: ((new Date().getTime() / 1000) - res.timestamp) > 600
            }
          });
        }
      });
      // because you have another then after this.
      // The best way to handle is to return isConnect;
      return null;
    }, () => {
      isConnected = false;
    }).then(() => {
      if (actualIsConnected !== isConnected) {
        if (isConnected === true) {
          let network = false;
          getBlock(0).then(res => {
            switch (res.hash) {
              case "0xa3c565fc15c7478862d50ccd6561e3c06b24cc509bf388941c25ea985ce32cb9":
                network = "kovan";
                break;
              case "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3":
                network = "main";
                break;
              default:
                console.log("setting network to private");
                console.log("res.hash:", res.hash);
                network = "private";
            }
            if (actualNetwork !== network) {
              resolve({
                status: 1,
                data: {
                  network: network,
                  isConnected: true,
                  latestBlock: 0
                }
              });
            }
          }, () => {
            if (actualNetwork !== network) {
              resolve({
                status: 1,
                data: {
                  network: network,
                  isConnected: true,
                  latestBlock: 0
                }
              });
            }
          });
        } else {
          resolve({
            status: 0,
            data: {
              isConnected: isConnected,
              network: false,
              latestBlock: 0
            }
          });
        }
      }
    }, e => reject(e));
  });
}
