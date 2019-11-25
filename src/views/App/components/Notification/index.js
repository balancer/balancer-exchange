import React, { useEffect, useState } from 'react'
import { Snackbar, IconButton, SnackbarContent } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { Close, Error } from '@material-ui/icons'
import Web3 from 'web3'

const useStyles = makeStyles(theme => ({
  close: {
    padding: theme.spacing(0.5)
  },
  error: {
    backgroundColor: '#d32f2f'
  },
  message: {
    display: 'flex',
    alignItems: 'center'
  }
}))

export default function Notification(props) {
  const classes = useStyles()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const { setError, errorMessage } = props
  const openNotification = (newMessage) => {
    setOpen(true)
    setMessage(newMessage)
  }

  if (errorMessage != null) {
    setTimeout(() => {
      openNotification(errorMessage)
    }, 100)
  }

  useEffect(() => {
    if (window.ethereum) {
      const { ethereum } = window
      const web3Provider = new Web3(ethereum)
      web3Provider.eth.getAccounts((err, accounts) => {
        if (accounts.length === 0) {
          openNotification('Please unlock your metamask account')
        }
      })
    } else {
      openNotification('Please install metamask')
    }
  }, [])

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }
    setError(null)
    setOpen(false)
  }


  return (
    <div>
      <Snackbar
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
      >
        <SnackbarContent
          className={classes.error}
          message={
            <span id="message-id" className={classes.message}>
              <Error />
              {message}
            </span>
          }
          action={[
            <IconButton key="close" aria-label="close" color="inherit" onClick={handleClose}>
              <Close />
            </IconButton>
          ]}
        />
      </Snackbar>
    </div>
  )
}
