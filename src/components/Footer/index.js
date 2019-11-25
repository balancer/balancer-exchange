import React, { Component } from 'react'
import BottomNavigation from '../BottomNavigation'
import { styles } from './styles.scss'

class Footer extends Component {
  render() {
    return (
      <div className={styles}>
        <BottomNavigation>
          <div className="container" />
        </BottomNavigation>
      </div>
    )
  }
}

export default Footer
