import React from "react";
import PropTypes from "prop-types";
import { AppBar as MuiAppBar } from "@material-ui/core";

const AppBar = props => {
  const { children } = props;

  return (
    <MuiAppBar position="static" className="app-bar">
      {children}
    </MuiAppBar>
  );
};

AppBar.propTypes = {
  children: PropTypes.node
};

AppBar.defaultProps = {
  children: null
};

export default AppBar;
