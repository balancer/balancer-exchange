import { observable, action } from 'mobx'
import * as deployed from "../deployed";
import * as blockchain from "utils/blockchain"
import * as helpers from "utils/helpers"
import sor from 'balancer-sor'
import {Decimal} from 'decimal.js'
import * as log from 'loglevel'

export const statusCodes = {
    NOT_LOADED: 0,
    PENDING: 1,
    ERROR: 2,
    SUCCESS: 3
}

export default class ProxyStore {
    @observable previewPending = false

    constructor(rootStore) {
        this.rootStore = rootStore;
    }

    isPreviewPending() {
        return this.previewPending
    }

    setPreviewPending(value) {
        this.previewPending = value
    }

    /* 
        Swap Methods - Action
    */
    @action batchSwapExactIn = async (tokenIn, tokenAmountIn, tokenOut, minAmountOut, maxPrice) => {
        const proxy = blockchain.loadObject('ExchangeProxy', deployed['kovan'].proxy, 'ExchangeProxy')
        let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

        let poolData = []

        pools.pools.forEach(p=> {
            let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
            let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
            let obj = {}
            obj.id = helpers.toChecksum(p.id)
            obj.balanceIn = Decimal(tI.balance)
            obj.balanceOut = Decimal(tO.balance)
            obj.weightIn = Decimal(tI.denormWeight).div(Decimal(p.totalWeight))
            obj.weightOut = Decimal(tO.denormWeight).div(Decimal(p.totalWeight))
            obj.swapFee = Decimal(p.swapFee)
            poolData.push(obj)
        })

        let gasPrice = 0.00000001 // 1 Gwei
        let gasPerTrade = 210000 // eg. 210k gas
        let outTokenEthPrice = 100

        let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
        let costOutputToken = costPerTrade * outTokenEthPrice

        let sorSwaps = sor.linearizedSolution(poolData, 'swapExactIn', tokenAmountIn, 20, costOutputToken)
        
        let swaps = []
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].toString()
            let swap = [ sorSwaps.selectedBalancers[i], helpers.toWei(swapAmount), helpers.toWei('0'), maxPrice ]
            swaps.push(swap)
        }
        await proxy.methods.batchSwapExactIn(swaps, tokenIn, tokenOut, helpers.toWei(tokenAmountIn), minAmountOut).send()
    }

    @action batchSwapExactOut = async (tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice) => {
        const proxy = blockchain.loadObject('ExchangeProxy', deployed['kovan'].proxy, 'ExchangeProxy')
        let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

        let poolData = []

        pools.pools.forEach(p=> {
            let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
            let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
            let obj = {}
            obj.id = helpers.toChecksum(p.id)
            obj.balanceIn = Decimal(tI.balance)
            obj.balanceOut = Decimal(tO.balance)
            obj.weightIn = Decimal(tI.denormWeight).div(Decimal(p.totalWeight))
            obj.weightOut = Decimal(tO.denormWeight).div(Decimal(p.totalWeight))
            obj.swapFee = Decimal(p.swapFee)
            poolData.push(obj)
        })

        let gasPrice = 0.00000001 // 1 Gwei
        let gasPerTrade = 210000 // eg. 210k gas
        let outTokenEthPrice = 100

        let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
        let costOutputToken = costPerTrade * outTokenEthPrice

        let sorSwaps = sor.linearizedSolution(poolData, 'swapExactOut', tokenAmountOut, 20, costOutputToken)
        
        let swaps = []
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let swapAmount = sorSwaps.inputAmounts[i].toString()
            let swap = [ sorSwaps.selectedBalancers[i], maxAmountIn, helpers.toWei(swapAmount), maxPrice ]
            swaps.push(swap)
        }
        await proxy.methods.batchSwapExactOut(swaps, tokenIn, tokenOut, maxAmountIn, helpers.toWei(tokenAmountOut)).send()
    }

    calcEffectivePrice(tokenAmountIn, tokenAmountOut) {
        const amountIn = Decimal(tokenAmountIn)
        const amountOut = Decimal(tokenAmountOut)
        const effectivePrice = amountIn.div(amountOut).toString()

        return effectivePrice
    }

    /* 
        Swap Methods - Preview
    */
    previewBatchSwapExactIn = async (tokenIn, tokenOut, tokenAmountIn) => {
        const proxy = blockchain.loadObject('ExchangeProxy', deployed['kovan'].proxy, 'ExchangeProxy')
        console.log('[Action] previewBatchSwapExactIn', tokenIn, tokenOut, tokenAmountIn)

        try {
            this.setPreviewPending(true)
            let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

            if (pools.pools.length === 0) throw Error('There are no pools with selected tokens')

            let poolData = []
            pools.pools.forEach(p=> {
                let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
                let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
                let obj = {}
                obj.id = helpers.toChecksum(p.id)
                obj.balanceIn = Decimal(tI.balance)
                obj.balanceOut = Decimal(tO.balance)
                obj.weightIn = Decimal(tI.denormWeight).div(Decimal(p.totalWeight))
                obj.weightOut = Decimal(tO.denormWeight).div(Decimal(p.totalWeight))
                obj.swapFee = Decimal(p.swapFee)
                poolData.push(obj)
            })

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty()
            let minAmountOut = helpers.setPropertyToZeroIfEmpty()

            let gasPrice = 0.00000001 // 1 Gwei
            let gasPerTrade = 210000 // eg. 210k gas
            let outTokenEthPrice = 100

            let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
            let costOutputToken = costPerTrade * outTokenEthPrice

            let sorSwaps = sor.linearizedSolution(poolData, 'swapExactIn', tokenAmountIn, 20, costOutputToken)
            
            let swaps = []
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let swapAmount = sorSwaps.inputAmounts[i].toString()
                let swap = [ sorSwaps.selectedBalancers[i], helpers.toWei(swapAmount), helpers.toWei('0'), maxPrice ]
                swaps.push(swap)
            }

            const preview = await proxy.methods.batchSwapExactIn(swaps, tokenIn, tokenOut, helpers.toWei(tokenAmountIn), minAmountOut).call()

            const effectivePrice = this.calcEffectivePrice(tokenAmountIn, helpers.fromWei(preview))

            const data = {
                outputAmount: preview,
                effectivePrice,
                swaps,
                validSwap: true
            }
            this.setPreviewPending(false)
            return data
        } catch (e) {
            log.error('[Error] previewSwapExactAmountIn', e)
            this.setPreviewPending(false)
            return {
                validSwap: false
            }
        }

    }
    
    previewBatchSwapExactOut = async (tokenIn, tokenOut, tokenAmountOut) => {
        const proxy = blockchain.loadObject('ExchangeProxy', deployed['kovan'].proxy, 'ExchangeProxy')
        console.log('[Action] previewBatchSwapExactOut', tokenIn, tokenOut, tokenAmountOut)

        try {
            this.setPreviewPending(true)
            let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

            if (pools.pools.length === 0) throw Error('There are no pools with selected tokens')
                
            let poolData = []
            pools.pools.forEach(p=> {
                let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
                let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
                let obj = {}
                obj.id = helpers.toChecksum(p.id)
                obj.balanceIn = Decimal(tI.balance)
                obj.balanceOut = Decimal(tO.balance)
                obj.weightIn = Decimal(tI.denormWeight).div(Decimal(p.totalWeight))
                obj.weightOut = Decimal(tO.denormWeight).div(Decimal(p.totalWeight))
                obj.swapFee = Decimal(p.swapFee)
                poolData.push(obj)
            })

            let maxPrice = helpers.setPropertyToMaxUintIfEmpty()
            let maxAmountIn = helpers.setPropertyToMaxUintIfEmpty()

            let gasPrice = 0.00000001 // 1 Gwei
            let gasPerTrade = 210000 // eg. 210k gas
            let outTokenEthPrice = 100

            let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
            let costOutputToken = costPerTrade * outTokenEthPrice

            let sorSwaps = sor.linearizedSolution(poolData, 'swapExactOut', tokenAmountOut, 20, costOutputToken)
            
            let swaps = []
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let swapAmount = sorSwaps.inputAmounts[i].toString()
                let swap = [ sorSwaps.selectedBalancers[i], maxAmountIn, helpers.toWei(swapAmount), maxPrice ]
                swaps.push(swap)
            }

            const preview = await proxy.methods.batchSwapExactOut(swaps, tokenIn, tokenOut, helpers.toWei(tokenAmountOut), maxAmountIn).call()

            const effectivePrice = this.calcEffectivePrice(tokenAmountOut, helpers.fromWei(preview))

            const data = {
                inputAmount: preview,
                effectivePrice,
                swaps,
                validSwap: true
            }

            this.setPreviewPending(false)
            return data
        } catch (e) {
            log.error('[Error] previewSwapExactAmountOut', e)
            this.setPreviewPending(false)
            return {
                validSwap: false
            }
        }

    }

}