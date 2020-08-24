import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div``;

const Warning = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    color: var(--info);
    width: 50%;
    margin: 20px auto;
    border: 1px solid var(--info);
    border-radius: 4px;
    padding: 20px;
    @media screen and (max-width: 1024px) {
        width: 80%;
    }
`;

const Message = styled.div`
    display: inline;
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
    font-size: 14px;
    line-height: 16px;
    letter-spacing: 0.2px;
`;

const WarningIcon = styled.img`
    width: 22px;
    height: 26px;
    margin-right: 20px;
    color: var(--info);
`;

const Link = styled.a`
    color: color: var(--info);
`;

const GeneralNotification = () => {
    return (
        <Wrapper>
            <Warning>
                <WarningIcon src="info-general-notification.svg" />
                <Message>
                    Exchange now uses multi path to route swaps across pools.
                    This required an updated{' '}
                    <Link
                        href="https://etherscan.io/address/0xB56b171C05d5FfCc623f8Ee497ef1Ce838179169#code"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        proxy contract
                    </Link>{' '}
                    which means your token approvals will have to be redone.
                </Message>
            </Warning>
        </Wrapper>
    );
};

export default GeneralNotification;
