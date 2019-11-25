import React from 'react'
import { Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import CircularProgress from '@material-ui/core/CircularProgress'

const useStyles = makeStyles(theme => ({
  progress: {
    margin: theme.spacing(2)
  }
}))

export default function LoadingCard({ title }) {
  const classes = useStyles()

  return (
    <div>
      <CircularProgress className={classes.progress} color="secondary" />
      <Typography>{title}</Typography>
    </div>
  )
}
