import React, { Component } from 'react'
import { observer, inject } from 'mobx-react'
import PropTypes from 'prop-types'
import { withRouter, Link } from 'react-router-dom'
import { Toolbar, Typography, IconButton } from '@material-ui/core'
import AccountCircle from '@material-ui/icons/AccountCircle'
import AppBar from '../AppBar'
import { styles } from './styles.scss'
import { appConfig } from '../../configs'

@inject('root')
@observer
class Header extends Component {
  constructor(props) {
    super(props)

    this.state = {
      anchorElement: null,
    }
  }

  getMenu() {
    const { providerStore } = this.props.root
    const address = providerStore.defaultAccount
    const { anchorElement } = this.state

    return (
      <div>
        <IconButton
          aria-haspopup="true"
          color="inherit"
          className="dropdown"
          aria-owns={anchorElement ? 'simple-menu' : null}
        >
          <div> {address} </div><AccountCircle />
        </IconButton>
      </div>
    )
  }

  render() {
    const menu = this.getMenu()

    return (
      <div className={styles}>
        <AppBar>
          <Toolbar>
            <Link className="menu-icon" href="/list" to="/list">
              <IconButton className="menu-icon" edge="start" color="inherit" aria-label="menu">
                <Typography variant="h5">
                  {appConfig.name}
                </Typography>
              </IconButton>
            </Link>
            {menu}
          </Toolbar>
        </AppBar>
      </div >
    )
  }
}

Header.propTypes = {
  history: PropTypes.shape({}).isRequired
}

export default withRouter(Header)
