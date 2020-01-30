import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TokenIconAddress } from './TokenPanel';
import { useStores } from '../../contexts/storesContext';
import { BigNumber } from 'ethers/utils';
import { fromWei, toWei } from 'utils/helpers';
import {
    getSupportedChainId,
    isChainIdSupported,
    web3ContextNames,
} from '../../provider/connectors';

const AssetPanelContainer = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    max-height: 329px;
    overflow: auto; /* Enable scroll if needed */
    ::-webkit-scrollbar {
        display: none;
    }
`;

const AssetPanel = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    width: 184px;
    height: 98px;
    cursor: pointer;
    border-right: 1px solid var(--panel-border);
    border-bottom: 1px solid var(--panel-border);
    :nth-child(3n + 3) {
        border-right: none;
    }
    :nth-child(10) {
        border-bottom: none;
    }
`;

const AssetWrapper = styled.div`
    display: flex;
    flex-direction: row;
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
`;

const TokenIcon = styled.img`
    width: 28px;
    height: 28px;
    margin-right: 12px;
`;

const TokenName = styled.div`
    font-size: 16px;
    line-height: 19px;
    display: flex;
    align-items: center;
`;

const TokenBalance = styled.div`
    font-size: 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    text-align: center;
    color: var(--body-text);
    margin-top: 12px;
`;

interface AssetSelectorData {
    address: string;
    iconAddress: string;
    symbol: string;
    userBalance: string;
}

const AssetOptions = ({ filter, modelOpen, setModalOpen }) => {
    // TODO do math and pass props into AssetPanel css to make border-bottom none for bottom row of assets

    const {
        root: { swapFormStore, providerStore, tokenStore },
    } = useStores();

    let assetSelectorData: AssetSelectorData[] = [];
    const supportedChainId = getSupportedChainId();
    const { chainId, account } = providerStore.getActiveWeb3React();

    let userBalances = {};
    let filteredWhitelistedTokens;
    const setSelectorDataWrapper = filter => {
        filteredWhitelistedTokens = tokenStore.getFilteredTokenMetadata(
            supportedChainId,
            filter
        );

        if (account && isChainIdSupported(chainId)) {
            userBalances = tokenStore.getAccountBalances(
                chainId,
                filteredWhitelistedTokens,
                account
            );
        }

        assetSelectorData = filteredWhitelistedTokens.map(value => {
            let userBalance = (userBalances[value.address] > 0)
                ? fromWei(userBalances[value.address]).toString()
                : '0.00';
            let balanceParts = userBalance.split(".");
            userBalance = balanceParts[0] + "." + balanceParts[1].substring(0, value.precision);                    
            if (userBalance.length > 20) {
                userBalance = userBalance.substring(0, 20) + '...';
            }
            return {
                address: value.address,
                iconAddress: value.iconAddress,
                symbol: value.symbol,
                userBalance: userBalance,
            };
        });
        return assetSelectorData;
    };
    setSelectorDataWrapper(filter);
    const [selectorData, setSelectorData] = useState(assetSelectorData);

    const clearInputs = () => {
        swapFormStore.inputs.inputAmount = '';
        swapFormStore.inputs.outputAmount = '';
    };

    const selectAsset = token => {
        if (modelOpen.input === 'inputAmount') {
            swapFormStore.inputs.inputToken = token.address;
            swapFormStore.inputs.inputTicker = token.symbol;
            swapFormStore.inputs.inputIconAddress = token.iconAddress;
        } else {
            swapFormStore.inputs.outputToken = token.address;
            swapFormStore.inputs.outputTicker = token.symbol;
            swapFormStore.inputs.outputIconAddress = token.iconAddress;
        }

        clearInputs();
        setModalOpen(false);
    };

    return (
        <AssetPanelContainer>
            {assetSelectorData.map(token => (
                <AssetPanel
                    onClick={() => {
                        selectAsset(token);
                    }}
                >
                    <AssetWrapper>
                        <TokenIcon src={TokenIconAddress(token.iconAddress)} />
                        <TokenName>{token.symbol}</TokenName>
                    </AssetWrapper>
                    <TokenBalance>
                        {token.userBalance + ' ' + token.symbol}
                    </TokenBalance>
                </AssetPanel>
            ))}
        </AssetPanelContainer>
    );
};

export default AssetOptions;
