import React from 'react'
import styled from 'styled-components'
import { toAddressStub } from 'utils/helpers';
import { Pie } from 'react-chartjs-2'

const Container = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
	margin-top: 32px;
	margin-bottom: 20px;
`

const Info = styled.div`
	display: flex;
	flex-direction: row;
	justify-content: center;
	font-family: var(--roboto);
	font-size: 14px;
	line-height: 20px;
	color: var(--header-text);
`

const DropDownArrow = styled.div`
	width: 20px;
	height: 20px;
	display: flex;
	justify-content: center;
	align-items: center;
	border: 1px solid var(--link-text);
	border-radius: 12px;
	color: var(--link-text);
	margin-left: 12px;
`

const UpCarretIcon = styled.img`
	height: 8px;
`

const CompositionDropDown = styled.div`
	width: 508px;
	height: 150px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--highlighted-selector-background);
	margin-top: 18px;
	border-radius: 6px;
`

const PoolLineContainer = styled.div`
	display: flex;
	flex-direction: column;
	margin-right: 32px;
`

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
`

const AddressAndBullet = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
`

const BulletPoint = styled.div`
	width: 12px;
	height: 12px;
	background: ${props => props.color || "#A7FFEB"};
	border-radius: 6px;
`

const Address = styled.div`
	color: var(--selector-text);
	margin-left: 16px;
`

const Percentage = styled.div`
	color: var(--token-balance-text);
`

const PieChartWrapper = styled.div`
  width: 96px;
  height: 96px;
`

const PieChart = styled.div`
	width: 96px;
	height: 96px;
	border: 1px solid #B388FF;
	border-radius: 50px;
`

const TradeComposition = ({}) => {

  const options = {
    maintainAspectRatio: false,
    legend: {
      display: false
    },
    tooltips: {
    	enabled: false
    }
  }

  const data = {
    datasets: [{
    	data: [1],
    	borderAlign: "center",
    	borderColor: "#B388FF",
    	borderWidth: "1",
    	weight: 1
    },
    {
    	data: [42, 30, 28],
    	borderAlign: "center",
    	backgroundColor: ["#A7FFEB", "#FF9E80", "#B388FF"],
    	borderColor: ["#A7FFEB", "#FF9E80", "#B388FF"],
    	borderWidth: "0",
    	weight: 95
    }]
  }

	return(
		<Container>
			<Info>
				<div>1 ETH = 150.00000 DAI</div>
				<DropDownArrow>
					<UpCarretIcon src="UpCarret.svg"/>
				</DropDownArrow>
			</Info>
			<CompositionDropDown>
				<PoolLineContainer>
					<PoolLine>
						<AddressAndBullet>
							<BulletPoint color="#A7FFEB"/>
							<Address>
								{toAddressStub("0x1940Fd4beAF634f8942f54586Fa92a29Fd1D9aFe")}
							</Address>
						</AddressAndBullet>
						<Percentage>42%</Percentage>
					</PoolLine>
					<PoolLine>
						<AddressAndBullet>
							<BulletPoint color="#FF9E80"/>
							<Address>
								{toAddressStub("0xA60fF6A7DDd60eE7BACde3eB749587b6206EdaB0")}
							</Address>
						</AddressAndBullet>
						<Percentage>30%</Percentage>
					</PoolLine>
					<PoolLine>
						<AddressAndBullet>
							<BulletPoint color="#B388FF"/>
							<Address>
								Others
							</Address>
						</AddressAndBullet>
						<Percentage>28%</Percentage>
					</PoolLine>
				</PoolLineContainer>
				<PieChartWrapper>
					<Pie data={data} options={options} />
				</PieChartWrapper>
			</CompositionDropDown>
		</Container>
	)
}

export default TradeComposition