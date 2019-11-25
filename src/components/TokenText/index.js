import React from 'react'
import { Tooltip, Typography } from '@material-ui/core'
import * as helpers from 'utils/helpers'

export default function TokenText(props) {
  const {
    weiValue
  } = props

  const etherValue = helpers.fromWei(weiValue)
  const roundedValue = helpers.roundValue(helpers.fromWei(weiValue))

  return (
    <Tooltip title={etherValue} interactive>
      <Typography>{roundedValue}</Typography>
    </Tooltip>
  )
}
