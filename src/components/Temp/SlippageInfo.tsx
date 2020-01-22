import React from 'react';
import Popup from 'reactjs-popup'
import styled from 'styled-components';
import { observer } from 'mobx-react';
import { useStores } from '../../contexts/storesContext';

const SlippageInfoContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    color: var(--header-text);
    font-family: var(--roboto);
    font-size: 14px;
    line-height: 16px;
    display: flex;
    align-items: center;
    margin-bottom: 28px;
`;

const SlippageInlineDisplay = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 24px;
    border: 1px solid var(--link-text);
    box-sizing: border-box;
    border-radius: 4px;
    margin-left: 10px;
    margin-right: 10px;
    color: var(--link-text);
    cursor: pointer;
`;

const InfoPopover = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border: 1px solid var(--info-border);
    border-radius: 8px;
    margin-left: 10px;
    font-size: 10px;
    cursor: pointer;
`;

const SlippageInfo = observer(
    ({ expectedSlippage, setSlippageSelectorOpen }) => {
        const {
            root: { swapFormStore },
        } = useStores();

        return (
            <SlippageInfoContainer>
                <div>Expected price slippage of {expectedSlippage} with</div>
                <SlippageInlineDisplay
                    onClick={() => {
                        setSlippageSelectorOpen(true);
                    }}
                >
                    {swapFormStore.inputs.slippageAmount}%
                </SlippageInlineDisplay>
                <div>additional limit</div>
			    <Popup
			      	trigger={<InfoPopover>i</InfoPopover>}
			      	position="top center"
			      	on="hover"
			    >
			    	<div>
			        	<div>Expected effective price</div>
			      	</div>
			    </Popup>                
            </SlippageInfoContainer>
        );
    }
);

export default SlippageInfo;
