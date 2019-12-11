//@ts-ignore
import React, { Component } from "react";
import { observer, inject } from "mobx-react";
import PropTypes from "prop-types";
import { withRouter, Link } from "react-router-dom";
import { Toolbar, Typography, IconButton } from "@material-ui/core";
import AccountCircle from "@material-ui/icons/AccountCircle";
import AppBar from "components/AppBar";
// import { styles } from "components/Header/styles.scss";
import { appConfig } from "configs";
import { makeStyles, withStyles } from "@material-ui/core/styles";

//@ts-ignore
const styles = {
  // styles: {
  //   position: "fixed",
  //   top: "0px",
  //   width: "100%"
  //   // z-index: "1",
  //   // '.dropdown': {
  //   //   position: "relative",
  //   //   right: "10px",
  //   //   top: "4px",
  //   //   z-index: "2",
  //   //   margin-left:"auto",
  //   //   margin-right:"0",
  //   // },
  //   // ".menu-icon": {
  //   //   color: "#ffffff";
  //   // },
  //   // '@media (min-width: 900px)': {
  //   //   '.dropdown': {
  //   //     top: "10px",
  //   //     right: "20px"
  //   //   }
  //   // }
  // }
};

@inject("root")
@observer
class Header extends Component<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      anchorElement: null
    };
  }

  getMenu() {
    const { providerStore } = this.props.root;
    const address = providerStore.defaultAccount;
    const { anchorElement } = this.state;

    return (
      <div>
        <IconButton
          aria-haspopup="true"
          color="inherit"
          className="dropdown"
          aria-owns={anchorElement ? "simple-menu" : null}
        >
          <div> {address} </div>
          <AccountCircle />
        </IconButton>
      </div>
    );
  }

  render() {
    const menu = this.getMenu();
    const { classes } = this.props;

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
                <Typography variant="h5">{appConfig.name}</Typography>
              </IconButton>
            </Link>
            {menu}
          </Toolbar>
        </AppBar>
      </div>
    );
  }
}

//@ts-ignore
Header.propTypes = {
  history: PropTypes.shape({}).isRequired
};

export default withRouter(withStyles(styles)(Header));
