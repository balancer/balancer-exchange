import React                   from 'react'
import { Button as MuiButton } from '@material-ui/core'
import PropTypes               from 'prop-types'
import { styles }              from './styles.scss'

const Button = (props) => {
  const {
    children,
    ...other
  } = props

  return (
    <div className={styles}>
      <MuiButton
        {...other}
      >
        {children}
      </MuiButton>
    </div>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  color: PropTypes.string,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  variant: PropTypes.string
}

Button.defaultProps = {
  className: 'btn',
  color: 'default',
  disabled: false,
  onClick: null,
  variant: 'contained'
}

export default Button
