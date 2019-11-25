import React from 'react'
import { Lock, LockOpen } from '@material-ui/icons'
import ToggleButton from '@material-ui/lab/ToggleButton'
import { observer, inject } from 'mobx-react'
import * as helpers from 'utils/helpers'

@inject('root')
@observer
class TokenApproveToggle extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      selected: false
    }
  }

  async componentDidMount() {
    await this.checkApproval()
  }

  async checkApproval() {
    const { providerStore, tokenStore } = this.props.root
    const { tokenAddress, poolAddress } = this.props
    const userAddress = providerStore.getDefaultAccount()
    await tokenStore.fetchAllowance(tokenAddress, userAddress, poolAddress)
    const allowance = tokenStore.getAllowance(tokenAddress, userAddress, poolAddress)

    if (allowance >= helpers.MAX_UINT / 2) {
      this.setState({ selected: true })
    } else {
      this.setState({ selected: false })
    }
  }

  async approveToken() {
    const { tokenStore } = this.props.root
    const { tokenAddress, poolAddress } = this.props
    const { selected } = this.state

    if (!selected) {
      await tokenStore.approveMax(tokenAddress, poolAddress)
      await this.checkApproval()
    } else {
      await tokenStore.revokeApproval(tokenAddress, poolAddress)
      await this.checkApproval()
    }
  }

  render() {
    const { selected } = this.state

    return (
      <ToggleButton
        value="check"
        selected={selected}
        onChange={() => this.approveToken()}
      >
        {
          selected ?
            <LockOpen />
            :
            <Lock />
        }

      </ToggleButton >
    )
  }
}

export default TokenApproveToggle
