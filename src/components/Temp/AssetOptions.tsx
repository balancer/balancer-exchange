import React, { useState } from 'react';
import styled from 'styled-components';
import { TokenIconAddress } from './TokenPanel';
import { useStores } from '../../contexts/storesContext';
import { fromWei } from 'utils/helpers';
import {
    getSupportedChainId,
    isChainIdSupported,
} from '../../provider/connectors';
import { observer } from 'mobx-react';

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
    isTradable: boolean;
}

const AssetOptions = observer(({ filter, modelOpen, setModalOpen }) => {
    // TODO do math and pass props into AssetPanel css to make border-bottom none for bottom row of assets

    const {
        root: { swapFormStore, providerStore, tokenStore, poolStore },
    } = useStores();

    let assetSelectorData: AssetSelectorData[] = [];
    const supportedChainId = getSupportedChainId();
    const { chainId, account } = providerStore.getActiveWeb3React();

    let userBalances = {};
    let filteredWhitelistedTokens;
    let tradableTokens;
    const setSelectorDataWrapper = filter => {
        filteredWhitelistedTokens = tokenStore.getFilteredTokenMetadata(
            supportedChainId,
            filter
        );

        if (modelOpen.input === 'inputAmount') {
            tradableTokens = poolStore.getTokenPairs(
                chainId,
                swapFormStore.inputs.outputToken
            );
            console.log({
                checkingFor: swapFormStore.inputs.outputToken,
                tradableTokens,
            });
        } else {
            tradableTokens = poolStore.getTokenPairs(
                chainId,
                swapFormStore.inputs.inputToken
            );
            console.log({
                checkingFor: swapFormStore.inputs.inputToken,
                tradableTokens,
            });
        }

        if (account && isChainIdSupported(chainId)) {
            userBalances = tokenStore.getAccountBalances(
                chainId,
                filteredWhitelistedTokens,
                account
            );
        }

        assetSelectorData = filteredWhitelistedTokens.map(value => {
            let userBalance = (userBalances[value.address] > 0)
                ? fromWei(userBalances[value.address])
                : '0.00';
            let balanceParts = userBalance.split(".");
            if (balanceParts[1].substring(0,8).length > 1) {
                userBalance = balanceParts[0] + "." + balanceParts[1].substring(0, value.precision);
            } else {
                userBalance = balanceParts[0] + "." + balanceParts[1].substring(0, 1) + "0"
            }
            if (userBalance.length > 20) {
                userBalance = userBalance.substring(0, 20) + '...';
            }

            if (tradableTokens) {
                console.log({ addressToFind: value.address, tradableTokens });
            }

            return {
                address: value.address,
                iconAddress: value.iconAddress,
                symbol: value.symbol,
                userBalance: userBalance,
                isTradable: tradableTokens
                    ? tradableTokens.has(value.address)
                    : false,
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
            poolStore.fetchAndSetTokenPairs(chainId, token.address);
        } else {
            swapFormStore.inputs.outputToken = token.address;
            swapFormStore.inputs.outputTicker = token.symbol;
            swapFormStore.inputs.outputIconAddress = token.iconAddress;
            poolStore.fetchAndSetTokenPairs(chainId, token.address);
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
                        {token.isTradable ? ' yes' : ' no'}
                    </TokenBalance>
                </AssetPanel>
            ))}
        </AssetPanelContainer>
    );
});

export default AssetOptions;
