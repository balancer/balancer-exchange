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

const Title = styled.div`
    display: flex;
    align-items: center;
    cursor: pointer;
    a {
        display: inline;
        font-size: 1rem;
        font-weight: 500;
        text-decoration: none;
        img {
            height: 32px;
            width: 32px;
        }
    }
`;

const AppName = styled.div`
    font-family: Roboto;
    font-style: normal;
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    letter-spacing: 1px;
    color: var(--header-text);
    margin-left: 12px;
`

const Header = () => {
    return (
        <HeaderFrame>
            <HeaderElement>
                <Title>
                    <a href="/">
                        <img src="pebbles-pad.svg" />
                    </a>
                    <AppName>{appConfig.name}</AppName>
                </Title>
            </HeaderElement>
            <HeaderElement>
                <Web3ConnectStatus />
            </HeaderElement>
        </HeaderFrame>
    );
};

export default Header;
