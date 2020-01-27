import React from 'react';
import styled from 'styled-components';

const Pill = styled.div`
    background: var(--panel-background);
    border: 1px solid var(--panel-border);
    border-radius: 4px;
    color: var(--button-text);

    display: flex;
    justify-content: space-evenly;
    align-items: center;
    text-align: center;

    font-family: var(--roboto);
    font-style: normal;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    cursor: pointer;

    width: 158px;
    height: 40px;
`;

const Web3PillBox = ({ children, onClick }) => {
    return <Pill onClick={onClick}>{children}</Pill>;
};

export default Web3PillBox;
