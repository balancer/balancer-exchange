import React      from 'react'
import PropTypes  from 'prop-types'
import { styles } from './styles.scss'

const EmptyState = (props) => {
  const { message, icon } = props

  return (
    <div className={styles}>
      <div className="placeholder">
        <span className="message">{message}</span>
        <div className="icon">{icon}</div>
      </div>
    </div>
  )
}

EmptyState.propTypes = {
  icon: PropTypes.element,
  message: PropTypes.string.isRequired
}

EmptyState.defaultProps = {
  icon: null
}

export default EmptyState
