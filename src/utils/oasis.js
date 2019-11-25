// Utils
import * as blockchain from "./blockchain";
import {addressToBytes32, methodSig, toBytes32, toWei} from "../utils/helpers";

// Settings
import * as settings from "../settings";

export const getBestPriceOffer = (network, tokenSell, tokenBuy) => {
  const offerTokenSell = settings.chain[network].tokens[tokenBuy.replace("eth", "weth")].address;
  const offerTokenBuy = settings.chain[network].tokens[tokenSell.replace("eth", "weth")].address;
  const otc = blockchain.loadObject("matchingmarket", settings.chain[network].otc);
  return new Promise((resolve, reject) => {
    otc.getBestOffer(offerTokenSell, offerTokenBuy, (e, r) => {
      if (!e) {
        otc.offers(r, (e2, r2) => {
          if (!e2) {
            resolve(
              (tokenSell === "dai" || (tokenSell === "eth" && tokenBuy !== "dai"))
              ?
                r2[2].div(r2[0])
              :
                r2[0].div(r2[2])
            );
          } else {
            reject(e2);
          }
        });
      } else {
        reject(e);
      }
    });
  });
}

export const getCallDataAndValue = (network, operation, from, to, amount, limit) => {
  const result = {};
  const otcBytes32 = addressToBytes32(settings.chain[network].otc, false);
  const fromAddrBytes32 = addressToBytes32(settings.chain[network].tokens[from.replace("eth", "weth")].address, false);
  const toAddrBytes32 = addressToBytes32(settings.chain[network].tokens[to.replace("eth", "weth")].address, false);
  if (operation === "sellAll") {
    if (from === "eth") {
      result.calldata = `${methodSig("sellAllAmountPayEth(address,address,address,uint256)")}` +
        `${otcBytes32}${fromAddrBytes32}${toAddrBytes32}${toBytes32(limit, false)}`;
      result.value = toWei(amount);
    } else if (to === "eth") {
      result.calldata = `${methodSig("sellAllAmountBuyEth(address,address,uint256,address,uint256)")}` +
        `${otcBytes32}${fromAddrBytes32}${toBytes32(toWei(amount), false)}${toAddrBytes32}${toBytes32(limit, false)}`;
    } else {
      result.calldata = `${methodSig("sellAllAmount(address,address,uint256,address,uint256)")}` +
        `${otcBytes32}${fromAddrBytes32}${toBytes32(toWei(amount), false)}${toAddrBytes32}${toBytes32(limit, false)}`;
    }
  } else {
    if (from === "eth") {
      result.calldata = `${methodSig("buyAllAmountPayEth(address,address,uint256,address)")}` +
        `${otcBytes32}${toAddrBytes32}${toBytes32(toWei(amount), false)}${fromAddrBytes32}`;
      result.value = limit;
    } else if (to === "eth") {
      result.calldata = `${methodSig("buyAllAmountBuyEth(address,address,uint256,address,uint256)")}` +
        `${otcBytes32}${toAddrBytes32}${toBytes32(toWei(amount), false)}${fromAddrBytes32}${toBytes32(limit, false)}`;
    } else {
      result.calldata = `${methodSig("buyAllAmount(address,address,uint256,address,uint256)")}` +
        `${otcBytes32}${toAddrBytes32}${toBytes32(toWei(amount), false)}${fromAddrBytes32}${toBytes32(limit, false)}`;
    }
  }
  return result;
}

export const getActionCreateProxyAndSellETH = (network, operation, to, amount, limit) => {
  const addrTo = settings.chain[network].tokens[to.replace("eth", "weth")].address;
  const result = {};

  if (operation === "sellAll") {
    result.method = "createAndSellAllAmountPayEth";
    result.params = [settings.chain[network].proxyRegistry, settings.chain[network].otc, addrTo, limit];
    result.value = toWei(amount);
  }
  else {
    result.method = "createAndBuyAllAmountPayEth";
    result.params = [settings.chain[network].proxyRegistry, settings.chain[network].otc, addrTo, toWei(amount)];
    result.value = limit;
  }
  return result;
}

export const roughTradeCost = (network, operation, tok1, amountTok1, tok2) => {
  return new Promise((resolve, reject) => {
    blockchain.loadObject("supportmethods", settings.chain[network].supportMethods)[`getOffersAmountTo${operation}`](
      settings.chain[network].otc,
      blockchain.objects[tok1.replace("eth", "weth")].address,
      toWei(amountTok1),
      blockchain.objects[tok2.replace("eth", "weth")].address,
      (e, r) => {
        if (!e) {
          resolve(r);
        } else {
          reject(e);
        }
      })
  });
}
  
