// Libraries
import React from "react";
import jazzicon from "jazzicon";

// Utils
import web3 from "./web3";

// Settings
import settings from "../settings.json";

export const { toBN, toHex, toWei, fromWei, isAddress, BN } = web3.utils;

export const MAX_GAS = 0xffffffff;
export const MAX_UINT = web3.utils.toTwosComplement('-1');

const TEN18 = new BN('1000000000000000000');

export const WAD = TEN18

var padLeft = function (string, chars, sign) {
  return new Array(chars - string.length + 1).join(sign ? sign : "0") + string;
};

export function toChecksum(address) {
  return web3.utils.toChecksumAddress(address)
}

export const toBytes32 = (x, prefix = true) => {
  let y = web3.toHex(x);
  y = y.replace("0x", "");
  y = padLeft(y, 64);
  if (prefix) y = "0x" + y;
  return y;
}

export const toBytes12 = (x, prefix = true) => {
  let y = web3.toHex(x);
  y = y.replace("0x", "");
  y = padLeft(y, 24);
  if (prefix) y = "0x" + y;
  return y;
}

export const addressToBytes32 = (x, prefix = true) => {
  let y = x.replace("0x", "");
  y = padLeft(y, 64);
  if (prefix) y = "0x" + y;
  return y;
}

export const formatNumber = (number, decimals = 0, isWei = true) => {
  let object = new BN(number);

  if (isWei) object = web3.fromWei(object.round(0));

  object = object.valueOf();

  if (decimals) {
    const whole = object.toString().split(".")[0];
    const decimal = object.toString().split(".")[1];
    object = whole.concat(".").concat(decimal ? decimal.substr(0, decimals) : "");
  }

  const parts = object.toString().split(".");
  const decimalsWithoutTrailingZeros = parts[1] ? parts[1].replace(/[0]+$/, "") : "";
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (decimalsWithoutTrailingZeros ? `.${decimalsWithoutTrailingZeros}` : "");
}

export const formatDate = timestamp => {
  const date = new Date(timestamp * 1000);
  return `${date.toDateString()} ${addZero(date.getHours())}:${addZero(date.getMinutes())}:${addZero(date.getSeconds())}`;
}

export const addZero = value => {
  return value > 9 ? value : `0${value}`;
}

export const fromRaytoWad = (x) => {
  return web3.toBN(x).div(web3.toBN(10).pow(9));
}

export function setPropertyToMaxUintIfEmpty(value) {
  if (!value || value === 0 || value === '') {
    value = hexToNumberString(MAX_UINT)
  }
  return value
}

export function setPropertyToZeroIfEmpty(value) {
  if (!value || value === '') {
    value = '0'
  }
  return value
}

export function checkIsPropertyEmpty(value) {
  if (!value || value === 0 || value === '') {
    return true
  }
  return false
}

export function toAddressStub(address) {
  const start = address.slice(0, 5)
  const end = address.slice(-3)

  return `${start}...${end}`
}

export function roundValue(value, decimals = 4) {
  const decimal = value.indexOf('.')
  if (decimal === -1) {
    return value
  }
  return value.slice(0, decimal + decimals + 1)
}

export function hexToNumberString(value) {
  return web3.utils.hexToNumberString(value)
}

export function fromFeeToPercentage(value) {
  const etherValue = web3.utils.fromWei(value)
  const percentageValue = etherValue * 100
  return percentageValue
}

export function fromPercentageToFee(value) {
  const weiValue = new BN(web3.utils.toWei(value, 'ether'))
  const feeValue = weiValue.div(new BN(100))
  return feeValue.toString()
}

export const copyToClipboard = e => {
  const value = e.target.title.replace(",", "");
  var aux = document.createElement("input");
  aux.setAttribute("value", value);
  document.body.appendChild(aux);
  aux.select();
  document.execCommand("copy");
  document.body.removeChild(aux);
  alert(`Value: "${value}" copied to clipboard`);
}

// Multiply WAD values
export const wmul = (a, b) => {
  return a.times(b).div(WAD);
}

//Divide WAD values
export const wdiv = (a, b) => {
  return a.times(WAD).div(b);
}

export const etherscanUrl = network => {
  return `https://${network !== "main" ? `${network}.` : ""}etherscan.io`;
}

export const etherscanAddress = (network, text, address) => {
  return <a className="address" href={`${etherscanUrl(network)}/address/${address}`} target="_blank"
    rel="noopener noreferrer">{text}</a>
}

export const etherscanTx = (network, text, tx) => {
  return <a href={`${etherscanUrl(network)}/tx/${tx}`} target="_blank" rel="noopener noreferrer">{text}</a>
}

export const etherscanToken = (network, text, token, holder = false) => {
  return <a href={`${etherscanUrl(network)}/token/${token}${holder ? `?a=${holder}` : ""}`} target="_blank"
    rel="noopener noreferrer">{text}</a>
}

export const methodSig = method => {
  return web3.sha3(method).substring(0, 10)
}

export const generateIcon = (address) => {
  return jazzicon(28, address.substr(0, 10));
}

export const fetchETHPriceInUSD = () => {
  return fetch("https://api.coinmarketcap.com/v2/ticker/1027/")
    .then(data => {
      return data.json();
    })
    .then((json) => {
      return json.data.quotes.USD.price;
    });
}

export const getGasPriceFromETHGasStation = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Request timed out!");
    }, 3000);

    fetch("https://ethgasstation.info/json/ethgasAPI.json").then(stream => {
      stream.json().then(price => {
        clearTimeout(timeout);
        resolve(price);
      })
    }, e => {
      clearTimeout(timeout);
      reject(e);
    });
  })
};

//TODO: eventually find a better solution
export const quotation = (from, to) => {
  if (to === "dai" || from === "dai") {
    const quote = "dai";
    const base = to === "dai" ? from : to;
    const isCounter = from !== "dai";

    return { base, quote, isCounter };
  }

  if (to === "eth" || from === "eth") {
    const quote = "eth";
    const base = to === "eth" ? from : to;
    const isCounter = from !== "eth";

    return { base, quote, isCounter };
  }
};

export const calculateTradePrice = (tokenSell, amountSell, tokenBuy, amountBuy) => {
  return (tokenSell === "dai" || (tokenSell === "eth" && tokenBuy !== "dai"))
    ?
    { price: amountSell.div(amountBuy), priceUnit: `${tokenBuy}/${tokenSell}` }
    :
    { price: amountBuy.div(amountSell), priceUnit: `${tokenSell}/${tokenBuy}` };
}

export const threshold = (network, from, to) => {
  return settings.chain[network].threshold[[from, to].sort((a, b) => {
    if (a > b) return 1;
    if (a < b) return -1;
    return 0;
  }).join("")];
};
