import React from 'react';
import styled from 'styled-components';
import {
    normalizePriceValuesInput,
    normalizePriceValuesOutput,
    toAddressStub,
    getEtherscanLink,
} from 'utils/helpers';
import { observer } from 'mobx-react';
import { Pie } from 'react-chartjs-2';
import { ChartData } from '../stores/SwapForm';
import { useStores } from '../contexts/storesContext';
import { getSupportedChainId } from '../provider/connectors';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-top: 32px;
    margin-bottom: 20px;
`;

const Info = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 20px;
    color: var(--header-text);
`;

const DropDownArrow = styled.div`
    width: 20px;
    height: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: 12px;
    cursor: pointer;
`;

const OppositeArrows = styled.img`
    height: 20px;
    cursor: pointer;
    transform: rotate(90deg);
`;

const UpCarretIcon = styled.img`
    height: 20px;
`;

const DownCarretIcon = styled.img`
    height: 20px;
`;

const CompositionDropDown = styled.div`
    width: 508px;
    height: 170px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--highlighted-selector-background);
    margin-top: 18px;
    border-radius: 6px;
`;

const CompositionTitle = styled.div`
    width: 315px;
    display: flex;
    color: var(--token-balance-text);
    font-size: 12px;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const PoolLineContainer = styled.div`
    display: flex;
    flex-direction: column;
    margin-right: 32px;
`;

const PoolLine = styled.div`
    height: 36px;
    width: 315px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
`;

const AddressAndBullet = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
`;

const BulletPoint = styled.div`
    width: 12px;
    height: 12px;
    background: ${props => props.color || '#A7FFEB'};
    border-radius: 6px;
`;

const Address = styled.div`
    color: var(--selector-text);
    margin-left: 16px;
`;

const AddressLink = styled.a`
    color: var(--selector-text);
`;

const Percentage = styled.div`
    color: var(--token-balance-text);
`;

const PieChartWrapper = styled.div`
    width: 96px;
    height: 96px;
`;

const Arrow = styled.div`
    color: var(--highlighted-selector-background);
    margin-left: 16px;
    font-family: var(--roboto);
    font-size: 20px;
    font-weight: 900;
`;

const TradeComposition = observer(() => {
    const {
        root: { swapFormStore },
    } = useStores();

    const supportedChainId = getSupportedChainId();
    const chartData = swapFormStore.tradeCompositionData;
    const { tradeCompositionOpen, exchangeRateInput } = swapFormStore;

    const options = {
        maintainAspectRatio: false,
        legend: {
            display: false,
        },
        tooltips: {
            enabled: false,
        },
    };

    const formatting = {
        borderAlign: 'center',
        backgroundColor: ['#A7FFEB', '#FF9E80', '#B388FF'],
        borderColor: ['#A7FFEB', '#FF9E80', '#B388FF'],
        borderWidth: '0',
        weight: 95,
    };

    const formatPieData = (chartData: ChartData) => {
        const pieData = {
            datasets: [
                {
                    data: [1],
                    label: 'swaps',
                    borderAlign: 'center',
                    borderColor: '#B388FF',
                    borderWidth: '1',
                    weight: 1,
                },
                {
                    data: [],
                    label: 'other',
                    borderAlign: 'center',
                    backgroundColor: ['#A7FFEB', '#FF9E80', '#B388FF'],
                    borderColor: ['#A7FFEB', '#FF9E80', '#B388FF'],
                    borderWidth: '0',
                    weight: 95,
                },
            ],
        };

        if (chartData.validSwap) {
            chartData.swaps.forEach(swap => {
                pieData.datasets[1].data.push(swap.percentage);
            });
        }
        return pieData;
    };

    const toggleDropDown = () => {
        if (tradeCompositionOpen) {
            return swapFormStore.setTradeCompositionOpen(false);
        } else {
            return swapFormStore.setTradeCompositionOpen(true);
        }
    };

    const toggleExchangeRate = () => {
        if (exchangeRateInput) {
            return swapFormStore.setExchangeRateInput(false);
        } else {
            return swapFormStore.setExchangeRateInput(true);
        }
    };

    const renderAddress = swap => {
        if (swap.isOthers) {
            return <Address>Others</Address>;
        }
        if (swap.noPools === 1) {
            return (
                <Address>
                    <AddressLink
                        href={getEtherscanLink(
                            supportedChainId,
                            swap.firstPoolAddress,
                            'address'
                        )}
                        target="_blank"
                    >
                        {toAddressStub(swap.firstPoolAddress)}
                    </AddressLink>
                </Address>
            );
        } else if (swap.noPools === 2) {
            return (
                <>
                    <Address>
                        <AddressLink
                            href={getEtherscanLink(
                                supportedChainId,
                                swap.firstPoolAddress,
                                'address'
                            )}
                            target="_blank"
                        >
                            {toAddressStub(swap.firstPoolAddress)}
                        </AddressLink>
                    </Address>
                    <Arrow>></Arrow>
                    <Address>
                        <AddressLink
                            href={getEtherscanLink(
                                supportedChainId,
                                swap.secondPoolAddress,
                                'address'
                            )}
                            target="_blank"
                        >
                            {toAddressStub(swap.secondPoolAddress)}
                        </AddressLink>
                    </Address>
                </>
            );
        }
    };

    const renderChartRows = (chartData: ChartData, formatting) => {
        if (chartData.validSwap) {
            return chartData.swaps.map((swap, index) => {
                return (
                    <PoolLine key={index}>
                        <AddressAndBullet>
                            <BulletPoint
                                color={formatting.borderColor[index]}
                            />

                            {renderAddress(swap)}
                        </AddressAndBullet>
                        <Percentage>{swap.percentage}%</Percentage>
                    </PoolLine>
                );
            });
        }

        return (
            <PoolLine>
                <AddressAndBullet>
                    <BulletPoint color={formatting.borderColor[0]} />
                    <Address>Please input a valid swap</Address>
                </AddressAndBullet>
            </PoolLine>
        );
    };

    const renderExchangeRate = (chartData: ChartData) => {
        const inputTokenData = swapFormStore.inputToken;
        const outputTokenData = swapFormStore.outputToken;

        if (chartData.validSwap) {
            if (exchangeRateInput) {
                const {
                    normalizedInput,
                    normalizedOutput,
                } = normalizePriceValuesInput(
                    chartData.inputPriceValue,
                    inputTokenData.decimals,
                    chartData.outputPriceValue,
                    outputTokenData.decimals
                );

                return (
                    <div>
                        {normalizedInput.toString()} {inputTokenData.symbol} ={' '}
                        {normalizedOutput.toPrecision(6)}{' '}
                        {outputTokenData.symbol}
                    </div>
                );
            } else {
                const {
                    normalizedInput,
                    normalizedOutput,
                } = normalizePriceValuesOutput(
                    chartData.inputPriceValue,
                    inputTokenData.decimals,
                    chartData.outputPriceValue,
                    outputTokenData.decimals
                );

                return (
                    <div>
                        {normalizedInput.toString()} {outputTokenData.symbol} ={' '}
                        {normalizedOutput.toPrecision(6)}{' '}
                        {inputTokenData.symbol}
                    </div>
                );
            }
        } else {
            return <div>Input swap parameters</div>;
        }
    };

    return (
        <Container>
            <Info>
                <OppositeArrows
                    src="swap.svg"
                    onClick={() => {
                        toggleExchangeRate();
                    }}
                />
                {renderExchangeRate(chartData)}
                <DropDownArrow
                    onClick={() => {
                        toggleDropDown();
                    }}
                >
                    <UpCarretIcon
                        src="arrow-bottom.svg"
                        style={{
                            display: tradeCompositionOpen ? 'block' : 'none',
                        }}
                    />
                    <DownCarretIcon
                        src="dropdown.svg"
                        style={{
                            display: tradeCompositionOpen ? 'none' : 'block',
                        }}
                    />
                </DropDownArrow>
            </Info>
            <CompositionDropDown
                style={{ display: tradeCompositionOpen ? 'flex' : 'none' }}
            >
                <CompositionTitle>
                    Your order has been optimized using {chartData.noPools}{' '}
                    Balancer pool{chartData.noPools > 1 ? 's' : ''} 🎉
                </CompositionTitle>
                <PoolLineContainer>
                    {renderChartRows(chartData, formatting)}
                </PoolLineContainer>
                <PieChartWrapper>
                    <Pie data={formatPieData(chartData)} options={options} />
                </PieChartWrapper>
            </CompositionDropDown>
        </Container>
    );
});

export default TradeComposition;
