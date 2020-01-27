//@ts-ignore
import React from 'react';
import { appConfig } from 'configs';
import styled from 'styled-components';
import Web3ConnectStatus from 'components/Web3ConnectStatus';

const HeaderFrame = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

const HeaderElement = styled.div`
    margin: 1.25rem;
    display: flex;
    min-width: 0;
    display: flex;
    align-items: center;
`;

const LogoWrapper = styled.span`
    transform: rotate(0deg);
    transition: transform 150ms ease-out;

    :hover {
        transform: rotate(-10deg);
    }
`;

const Title = styled.div`
    display: flex;
    align-items: center;
    cursor: pointer;

    a {
        display: inline;
        font-size: 1rem;
        font-weight: 500;
        color: ${({ theme }) => theme.wisteriaPurple};
        text-decoration: none;
        h1 {
            font-size: 1rem;
            font-weight: 500;
        }
    }
`;

const Header = () => {
    return (
        <HeaderFrame>
            <HeaderElement>
                <Title>
                    <LogoWrapper>
                        <a id="title" href="/">
                            <span role="img" aria-label="unicorn">
                                ⚖️{'  '}
                            </span>
                        </a>
                    </LogoWrapper>
                    <a id="title" href="/">
                        <h1 id="title"> {appConfig.name}</h1>
                    </a>
                </Title>
            </HeaderElement>
            <HeaderElement>
                <Web3ConnectStatus />
            </HeaderElement>
        </HeaderFrame>
    );
};

export default Header;
