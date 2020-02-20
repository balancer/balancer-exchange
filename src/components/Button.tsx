import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
    font-family: var(--roboto);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
`;

const ButtonBase = styled.div`
    border-radius: 4px;
    width: 163px;
    height: 40px;

    font-family: var(--roboto);
    font-style: normal;
    font-weight: 500;
    font-size: 14px;
    line-height: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    cursor: pointer;
`;

const ActiveButton = styled(ButtonBase)`
    background: var(--button-background);
    border: 1px solid var(--button-border);
    color: var(--button-text);
`;

const InactiveButton = styled(ButtonBase)`
    background: var(--background);
    border: 1px solid var(--inactive-button-border);
    color: var(--inactive-button-text);
`;

const Button = ({ buttonText, active, onClick }) => {
    const ButtonDisplay = ({ activeButton, children }) => {
        if (activeButton) {
            return <ActiveButton onClick={onClick}>{children}</ActiveButton>;
        } else {
            return <InactiveButton>{children}</InactiveButton>;
        }
    };

    return (
        <Container>
            <ButtonDisplay activeButton={active}>{buttonText}</ButtonDisplay>
        </Container>
    );
};

export default Button;
