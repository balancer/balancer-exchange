import React from 'react';
import styled from 'styled-components';
import { TokenIconAddress } from './TokenPanel';
import { useStores } from '../contexts/storesContext';
import { bnum, formatBalanceTruncated } from 'utils/helpers';
import {
    getSupportedChainId,
    isChainIdSupported,
} from '../provider/connectors';
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

interface Asset {
    address: string;
    iconAddress: string;
    symbol: string;
    userBalance: string;
    isTradable: boolean;
}

const AssetOptions = observer(() => {
    // TODO do math and pass props into AssetPanel css to make border-bottom none for bottom row of assets

    const {
        root: { providerStore, swapFormStore, tokenStore, poolStore },
    } = useStores();

    const supportedChainId = getSupportedChainId();
    const { chainId, account } = providerStore.getActiveWeb3React();

    const { assetSelectFilter, assetModalState } = swapFormStore;

    const getAssetOptions = (filter, chainId, account): Asset[] => {
        const filteredWhitelistedTokens = tokenStore.getFilteredTokenMetadata(
            supportedChainId,
            filter
        );

        let assetSelectorData: Asset[] = [];
        let userBalances = {};
        let tradableTokens;

        if (assetModalState.input === 'inputAmount') {
            tradableTokens = poolStore.getTokenPairs(
                swapFormStore.inputs.outputToken
            );
        } else if (assetModalState.input === 'outputAmount') {
            tradableTokens = poolStore.getTokenPairs(
                swapFormStore.inputs.inputToken
            );
        }

        if (account && isChainIdSupported(chainId)) {
            userBalances = tokenStore.getAccountBalances(
                chainId,
                filteredWhitelistedTokens,
                account
            );
        }

        assetSelectorData = filteredWhitelistedTokens.map(value => {
            const userBalance = formatBalanceTruncated(
                userBalances[value.address]
                    ? bnum(userBalances[value.address])
                    : bnum(0),
                value.decimals,
                value.precision,
                20
            );

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

    const sortAssetOptions = (assets: Asset[], account) => {
        const buckets = {
            tradableWithBalance: [] as Asset[],
            tradableWithoutBalance: [] as Asset[],
            notTradableWithBalance: [] as Asset[],
            notTradableWithoutBalance: [] as Asset[],
        };
        assets.forEach(asset => {
            const isTradable = asset.isTradable;
            const hasBalance = account && bnum(asset.userBalance).gt(0);

            if (isTradable && hasBalance) {
                buckets.tradableWithBalance.push(asset);
            } else if (isTradable && !hasBalance) {
                buckets.tradableWithoutBalance.push(asset);
            } else if (!isTradable && hasBalance) {
                buckets.notTradableWithBalance.push(asset);
            } else if (!isTradable && !hasBalance) {
                buckets.notTradableWithoutBalance.push(asset);
            }
        });

        // We don't introduce a possibility of duplicates and therefore don't need to use Set
        return [
            ...buckets.tradableWithBalance,
            ...buckets.tradableWithoutBalance,
            ...buckets.notTradableWithBalance,
            ...buckets.notTradableWithoutBalance,
        ];
    };

    const assets = sortAssetOptions(
        getAssetOptions(assetSelectFilter, chainId, account),
        account
    );

    const clearInputs = () => {
        swapFormStore.inputs.inputAmount = '';
        swapFormStore.inputs.outputAmount = '';
        swapFormStore.clearErrorMessage();
        swapFormStore.clearTradeComposition();
    };

    const selectAsset = token => {
        if (assetModalState.input === 'inputAmount') {
            swapFormStore.inputs.inputToken = token.address;
            swapFormStore.inputs.inputTicker = token.symbol;
            swapFormStore.inputs.inputIconAddress = token.iconAddress;
        } else {
            swapFormStore.inputs.outputToken = token.address;
            swapFormStore.inputs.outputTicker = token.symbol;
            swapFormStore.inputs.outputIconAddress = token.iconAddress;
        }

        poolStore.fetchAndSetTokenPairs(token.address);
        clearInputs();
        swapFormStore.setAssetModalState({ open: false });
    };

    return (
        <AssetPanelContainer>
            {assets.map(token => (
                <AssetPanel
                    onClick={() => {
                        selectAsset(token);
                    }}
                    key={token.address}
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
