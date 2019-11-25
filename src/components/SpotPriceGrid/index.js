import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Grid from '@material-ui/core/Grid'
import Card from '@material-ui/core/Card'
import { Typography, CardContent } from '@material-ui/core'


const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  }
}))

export default function SpotPriceGrid(props) {
  const {
    inputAmount, outputAmount, effectivePrice
  } = props

  const classes = useStyles()

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={12}>
          <Card>
            <CardContent>
              {
                inputAmount ?
                  <Typography variant="body1">{`Input: ${inputAmount}\n`}</Typography>
                  :
                  <div />
              }
              {
                outputAmount ?
                  <Typography variant="body1">{`Output: ${outputAmount}\n`}</Typography>
                  :
                  <div />
              }
              {
                effectivePrice ?
                  <Typography variant="body1">{`Output: ${effectivePrice}\n`}</Typography>
                  :
                  <div />
              }
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}
