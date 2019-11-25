import * as React from "react";
import { DAI, Ether, MKR } from "../components/Icons/Icons"

const eth = {
  icon: <Ether />,
  symbol: "ETH",
  name: "Ether"
};

const dai = {
  icon: <DAI />,
  symbol: "DAI",
  name: "DAI",
};

const mkr = {
  icon: <MKR />,
  symbol: "MKR",
  name: "Maker"
};

const tokens = process.env.OASIS_HIDE_MKR === "1" ? Object.freeze({ eth, dai }) : Object.freeze({ eth, dai, mkr });


export const excludes = (symbol = "") => {
  const symbols = Object.keys(tokens);

  if (typeof symbol === "string") {
    return symbols.filter(token => token.toLowerCase() !== symbol.toLowerCase());
  }

  return symbols;
};

export default tokens;