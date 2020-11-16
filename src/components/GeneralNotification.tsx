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
                    The exchange has been upgraded to use multi-path order
                    routing which improves overall pricing and gas usage. You
                    will need to unlock tokens again for the new{' '}
                    <Link
                        href="https://etherscan.io/address/0x3E66B66Fd1d0b02fDa6C811Da9E0547970DB2f21"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        proxy contract
                    </Link>
                    . To use the old exchange proxy visit:{' '}
                    <Link
                        href="https://legacy.balancer.exchange"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        https://legacy.balancer.exchange
                    </Link>
                </Message>
            </Warning>
        </Wrapper>
    );
};

export default GeneralNotification;
