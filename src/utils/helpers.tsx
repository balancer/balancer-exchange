// Libraries
import React from "react";
import jazzicon from "jazzicon";
import { Decimal } from "decimal.js";

// Utils
import web3 from "./web3";

export const { toWei, fromWei, isAddress } = web3.utils;

export const MAX_GAS = 0xffffffff;
export const MAX_UINT = web3.utils.toTwosComplement("-1");

var padLeft = function(string, chars, sign) {
  return new Array(chars - string.length + 1).join(sign ? sign : "0") + string;
};

export function toChecksum(address) {
  return web3.utils.toChecksumAddress(address);
}

export const formatDate = timestamp => {
  const date = new Date(timestamp * 1000);
  return `${date.toDateString()} ${addZero(date.getHours())}:${addZero(
    date.getMinutes()
  )}:${addZero(date.getSeconds())}`;
};

export const addZero = value => {
  return value > 9 ? value : `0${value}`;
};

export function setPropertyToMaxUintIfEmpty(value?) {
  if (!value || value === 0 || value === "") {
    value = hexToNumberString(MAX_UINT);
  }
  return value;
}

export function setPropertyToZeroIfEmpty(value?) {
  if (!value || value === "") {
    value = "0";
  }
  return value;
}

export function checkIsPropertyEmpty(value?) {
  if (!value || value === 0 || value === "") {
    return true;
  }
  return false;
}

export function toAddressStub(address) {
  const start = address.slice(0, 5);
  const end = address.slice(-3);

  return `${start}...${end}`;
}

export function roundValue(value, decimals = 4) {
  const decimal = value.indexOf(".");
  if (decimal === -1) {
    return value;
  }
  return value.slice(0, decimal + decimals + 1);
}

export function hexToNumberString(value) {
  return web3.utils.hexToNumberString(value);
}

export function str(value: any): string {
  return value.toString();
}

export function fromFeeToPercentage(value) {
  const etherValue = new Decimal(web3.utils.fromWei(value));
  const percentageValue = etherValue.times(100);
  return percentageValue;
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
};

export const etherscanUrl = network => {
  return `https://${network !== "main" ? `${network}.` : ""}etherscan.io`;
};

export const etherscanAddress = (network, text, address) => {
  return (
    <a
      className="address"
      href={`${etherscanUrl(network)}/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const etherscanTx = (network, text, tx) => {
  return (
    <a
      href={`${etherscanUrl(network)}/tx/${tx}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const etherscanToken = (network, text, token, holder = false) => {
  return (
    <a
      href={`${etherscanUrl(network)}/token/${token}${
        holder ? `?a=${holder}` : ""
      }`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {text}
    </a>
  );
};

export const generateIcon = address => {
  return jazzicon(28, address.substr(0, 10));
};

export const getGasPriceFromETHGasStation = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject("Request timed out!");
    }, 3000);

    fetch("https://ethgasstation.info/json/ethgasAPI.json").then(
      stream => {
        stream.json().then(price => {
          clearTimeout(timeout);
          resolve(price);
        });
      },
      e => {
        clearTimeout(timeout);
        reject(e);
      }
    );
  });
};
