import React, { Component }   from 'react'
import PropTypes              from 'prop-types'
import { Paper }              from '@material-ui/core'
import { styles }             from './styles.scss'

class BottomNavigation extends Component {
  render() {
    const { children, transparent } = this.props
    const isTransparent = transparent ? 'transparent' : 'not-transparent'

    return (
      <div className={styles}>
        <Paper>
          <div className={`bottom-navigation ${isTransparent}`}>
            {children}
          </div>
        </Paper>
      </div>
    )
  }
}

BottomNavigation.propTypes = {
  children: PropTypes.node.isRequired,
  transparent: PropTypes.bool
}

BottomNavigation.defaultProps = {
  transparent: false
}

export default BottomNavigation
