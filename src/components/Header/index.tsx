//@ts-ignore
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { Toolbar, Typography, IconButton } from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';
import AppBar from 'components/AppBar';
// import { styles } from "components/Header/styles.scss";
import { appConfig } from 'configs';
import { makeStyles } from '@material-ui/core/styles';
import { useStores } from '../../contexts/storesContext';
import styled from 'styled-components';
import { Link } from '../../theme';
import Web3ConnectStatus from 'components/Web3ConnectStatus';
import { darken } from 'polished';

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

const Nod = styled.span`
    transform: rotate(0deg);
    transition: transform 150ms ease-out;

    :hover {
        transform: rotate(-10deg);
    }
`;

const Title = styled.div`
    display: flex;
    align-items: center;

    :hover {
        cursor: pointer;
    }

    #link {
        text-decoration-color: ${({ theme }) => theme.UniswapPink};
    }

    #title {
        display: inline;
        font-size: 1rem;
        font-weight: 500;
        color: ${({ theme }) => theme.wisteriaPurple};
        :hover {
            color: ${({ theme }) => darken(0.1, theme.wisteriaPurple)};
        }
    }
`;

const useStyles = makeStyles({
    styles: {
        position: 'fixed',
    },
});

const Header = () => {
    const [anchorElement, setAnchorElement] = useState(undefined);
    const {
        root: { providerStore },
    } = useStores();

    return (
        <HeaderFrame>
            <HeaderElement>
                <Title>
                    <Nod>
                        <Link id="link" href="/">
                            <span role="img" aria-label="unicorn">
                                ⚖️{'  '}
                            </span>
                        </Link>
                    </Nod>
                    <Link id="link" href="/" to="/list">
                        <h1 id="title"> {appConfig.name}</h1>
                    </Link>
                </Title>
            </HeaderElement>
            <HeaderElement>
                <Web3ConnectStatus />
            </HeaderElement>
        </HeaderFrame>
    );
};

export default Header;
