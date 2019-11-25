import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Card from '@material-ui/core/Card'
// import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
// import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'

const useStyles = makeStyles({
  card: {
    minWidth: 150
  },
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)'
  },
  title: {
    fontSize: 14
  },
  pos: {
    marginBottom: 12
  }
})

export default function IconCard(props) {
  const {
 title, text, text2, addRows
} = props
  const classes = useStyles()
  // const bull = <span className={classes.bullet}>•</span>

  return (
    <Card className={classes.card}>
      <CardContent>
        <Typography variant="h5" component="h2">
          {title}
        </Typography>
        {/* <Typography className={classes.pos} color="textSecondary">
                    adjective
                </Typography> */}
        <Typography variant="body2" component="p">
          {text}
        </Typography>
        {
          text2 ? (<Typography variant="body2" component="p">
            {text2}
          </Typography>) :
          <div />
        }
        {
          addRows ? (<br />) :
          <div />
        }

      </CardContent>
      {/* <CardActions>
                <Button size="small">Learn More</Button>
            </CardActions> */}
    </Card >
  )
}
