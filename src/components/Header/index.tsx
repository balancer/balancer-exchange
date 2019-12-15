//@ts-ignore
import React, { useState } from 'react';
import { observer } from 'mobx-react';
import PropTypes from 'prop-types';
import { withRouter, Link } from 'react-router-dom';
import { Toolbar, Typography, IconButton } from '@material-ui/core';
import AccountCircle from '@material-ui/icons/AccountCircle';
import AppBar from 'components/AppBar';
// import { styles } from "components/Header/styles.scss";
import { appConfig } from 'configs';
import { makeStyles } from '@material-ui/core/styles';
import { useStores } from '../../contexts/storesContext';

const useStyles = makeStyles({
    styles: {
        position: 'fixed',
    },
});

//@ts-ignore
const styles = {
    // styles: {
    // position: 'fixed',
    // top: '0px',
    // width: '100%',
    // 'z-index': '1',
    // '.dropdown': {
    //   position: "relative",
    //   right: "10px",
    //   top: "4px",
    //   z-index: "2",
    //   margin-left:"auto",
    //   margin-right:"0",
    // },
    // ".menu-icon": {
    //   color: "#ffffff";
    // },
    // '@media (min-width: 900px)': {
    //   '.dropdown': {
    //     top: "10px",
    //     right: "20px"
    //   }
    // }
    // },
};

const Header = () => {
    const [anchorElement, setAnchorElement] = useState(undefined);
    const {
        root: { providerStore },
    } = useStores();

    //@ts-ignore
    const classes = useStyles();

    function getMenu() {
        const address = providerStore.defaultAccount;

        return (
            <div>
                <IconButton
                    aria-haspopup="true"
                    color="inherit"
                    className="dropdown"
                    aria-owns={anchorElement ? 'simple-menu' : undefined}
                >
                    <div> {address} </div>
                    <AccountCircle />
                </IconButton>
            </div>
        );
    }

    return (
        <div className={classes.styles}>
            <AppBar>
                <Toolbar>
                    <Link className="menu-icon" href="/list" to="/list">
                        <IconButton
                            className="menu-icon"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                        >
                            <Typography variant="h5">
                                {appConfig.name}
                            </Typography>
                        </IconButton>
                    </Link>
                    {getMenu()}
                </Toolbar>
            </AppBar>
        </div>
    );
};

export default Header;
