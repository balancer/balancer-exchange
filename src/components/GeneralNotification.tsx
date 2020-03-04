import React from 'react';
import styled from 'styled-components';
import * as deployed from '../deployed.json';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 75px;
    width: 100%;
`;

const Header = styled.div`
`;

const ExitComponent = styled.div`
    color: var(--exit-modal-color);
    transform: rotate(135deg);
    font-size: 22px;
    cursor: pointer;
`;

const Body = styled.div`
    font-family: Roboto;
    font-style: normal;
    font-weight: normal;
    font-size: 20px;
    line-height: 16px;
    letter-spacing: 0.6px;
    color: var(--body-text);
    padding: 25px;
    border: 1px solid var(--panel-border);
`;

const GeneralNotification = () => {
    return(
        <Wrapper>
            <Body>
                { deployed['kovan'].notification }
            </Body>
        </Wrapper>
    );
}

export default GeneralNotification;