import { observable, action } from 'mobx'
import * as deployed from "../deployed";
import * as blockchain from "utils/blockchain"
import * as helpers from "utils/helpers"
import sor from 'balancer-sor'
import Big from 'big.js/big.mjs';
import * as log from 'loglevel'

export const statusCodes = {
    NOT_LOADED: 0,
    PENDING: 1,
    ERROR: 2,
    SUCCESS: 3
}

export default class ProxyStore {
    @observable knownPools = {}
    @observable knownPoolsLoaded = false
    @observable currentPool = undefined
    @observable poolData = {}
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
        const proxy = blockchain.loadObject('ExchangeProxy', deployed.proxy, 'ExchangeProxy')
        let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

        let poolData = []

        pools.pools.forEach(p=> {
            let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
            let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
            let obj = {}
            obj.id = helpers.toChecksum(p.id)
            obj.Bi = Number(tI.balance)
            obj.Bo = Number(tO.balance)
            obj.wi = tI.denormWeight / p.totalWeight
            obj.wo = tO.denormWeight / p.totalWeight
            obj.fee = Number(p.swapFee)
            poolData.push(obj)
        })

        let gasPrice = 0.00000001 // 1 Gwei
        let gasPerTrade = 210000 // eg. 210k gas
        let outTokenEthPrice = 100

        let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
        let costOutputToken = costPerTrade * outTokenEthPrice

        let sorSwaps = await sor.linearizedSolution(poolData, 'swapExactIn', tokenAmountIn, 20, costOutputToken)
        
        let swaps = []
        for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
            let fWAmount = helpers.fromWei(String(sorSwaps.inputAmounts[0]))
            let tWAmount = helpers.toWei(fWAmount)
            let swap = [ sorSwaps.selectedBalancers[i], tWAmount, helpers.toWei('0'), maxPrice ]
            swaps.push(swap)
        }
        await proxy.methods.batchSwapExactIn(swaps, tokenIn, tokenOut, tokenAmountIn, minAmountOut).send()
    }
    // @action swapExactAmountOut = async (poolAddress, tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice) => {
    //     const bPool = blockchain.loadObject('BPool', poolAddress, 'BPool')
    //     const defaultAccount = blockchain.getDefaultAccount()
    //     await bPool.methods.swap_ExactAmountOut(tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice).send()
    //     await this.fetchTokenParams(poolAddress)
    //     await this.fetchInvestParams(poolAddress, defaultAccount)
    // }
    // @action swapExactMarginalPrice = async (poolAddress, tokenIn, limitAmountIn, tokenOut, limitAmountOut, marginalPrice) => {
    //     const bPool = blockchain.loadObject('BPool', poolAddress, 'BPool')
    //     const defaultAccount = blockchain.getDefaultAccount()
    //     await bPool.methods.swap_ExactMarginalPrice(tokenIn, limitAmountIn, tokenOut, limitAmountOut, marginalPrice).send()
    //     await this.fetchTokenParams(poolAddress)
    //     await this.fetchInvestParams(poolAddress, defaultAccount)
    // }

    calcEffectivePrice(tokenAmountIn, tokenAmountOut) {
        const amountIn = new Big(tokenAmountIn)
        const amountOut = new Big(tokenAmountOut)
        const effectivePrice = amountIn.div(amountOut).toString()

        return effectivePrice
    }

    /* 
        Swap Methods - Preview
    */
    previewBatchSwapExactIn = async (tokenIn, tokenAmountIn, tokenOut, minAmountOut, maxPrice) => {
        const proxy = blockchain.loadObject('ExchangeProxy', deployed.proxy, 'ExchangeProxy')
        console.log('[Action] previewBatchSwapExactIn', tokenIn, tokenAmountIn, tokenOut, minAmountOut, maxPrice)

        try {
            this.setPreviewPending(true)
            let pools = await sor.getPoolsWithTokens(tokenIn, tokenOut)

            console.log('Pools with tokens from subgraph:')
            console.log(pools.pools)

            let poolData = []

            pools.pools.forEach(p=> {
                let tI = p.tokens.find(t => helpers.toChecksum(t.address) === tokenIn)
                let tO = p.tokens.find(t => helpers.toChecksum(t.address) === tokenOut)
                let obj = {}
                obj.id = helpers.toChecksum(p.id)
                obj.Bi = Number(tI.balance)
                obj.Bo = Number(tO.balance)
                obj.wi = tI.denormWeight / p.totalWeight
                obj.wo = tO.denormWeight / p.totalWeight
                obj.fee = Number(p.swapFee)
                poolData.push(obj)
            })

            let gasPrice = 0.00000001 // 1 Gwei
            let gasPerTrade = 210000 // eg. 210k gas
            let outTokenEthPrice = 100

            let costPerTrade = gasPrice * gasPerTrade // eg. 210k gas @ 10 Gwei
            let costOutputToken = costPerTrade * outTokenEthPrice

            let sorSwaps = await sor.linearizedSolution(poolData, 'swapExactIn', tokenAmountIn, 20, costOutputToken)

            console.log('Swaps froms SOR:')
            console.log(sorSwaps)
            
            let swaps = []
            for (let i = 0; i < sorSwaps.inputAmounts.length; i++) {
                let fWAmount = helpers.fromWei(String(sorSwaps.inputAmounts[0]))
                let tWAmount = helpers.toWei(fWAmount)
                let swap = [ sorSwaps.selectedBalancers[i], tWAmount, helpers.toWei('0'), maxPrice ]
                swaps.push(swap)
            }

            const preview = await proxy.methods.batchSwapExactIn(swaps, tokenIn, tokenOut, tokenAmountIn, minAmountOut).call()

            const effectivePrice = this.calcEffectivePrice(tokenAmountIn, preview)

            const data = {
                outputAmount: preview,
                effectivePrice,
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
    // previewSwapExactAmountOut = async (poolAddress, tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice) => {
    //     const bPool = blockchain.loadObject('BPool', poolAddress, 'BPool')
    //     console.log('[Action] previewSwapExactAmountOut', poolAddress, tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice)

    //     try {
    //         this.setPreviewPending(true)
    //         const tokenPools = await sor.getPoolsWithTokens(tokenIn, tokenOut)
    //         console.log(tokenPools)
    //         const preview = await bPool.methods.swap_ExactAmountOut(tokenIn, maxAmountIn, tokenOut, tokenAmountOut, maxPrice).call()
    //         const effectivePrice = this.calcEffectivePrice(preview['tokenAmountIn'], tokenAmountOut)

    //         const data = {
    //             inputAmount: preview['tokenAmountIn'],
    //             spotPriceTarget: preview['spotPriceTarget'],
    //             effectivePrice,
    //             validSwap: true
    //         }
    //         this.setPreviewPending(false)
    //         return data
    //     } catch (e) {
    //         log.error('[Error] previewSwapExactAmountOut', e)
    //         this.setPreviewPending(false)
    //         return {
    //             validSwap: false
    //         }
    //     }

    // }
    // previewSwapExactMarginalPrice = async (poolAddress, tokenIn, limitAmountIn, tokenOut, limitAmountOut, marginalPrice) => {
    //     const bPool = blockchain.loadObject('BPool', poolAddress, 'BPool')
    //     console.log('[Action] previewSwapExactMarginalPrice', poolAddress, tokenIn, limitAmountIn, tokenOut, limitAmountOut, marginalPrice)

    //     try {
    //         this.setPreviewPending(true)
    //         const preview = await bPool.methods.swap_ExactMarginalPrice(tokenIn, limitAmountIn, tokenOut, limitAmountOut, marginalPrice).call()
    //         const effectivePrice = this.calcEffectivePrice(preview['tokenAmountIn'], preview['tokenAmountOut'])

    //         const data = {
    //             inputAmount: preview['tokenAmountIn'],
    //             outputAmount: preview['tokenAmountOut'],
    //             effectivePrice,
    //             validSwap: true
    //         }

    //         this.setPreviewPending(false)
    //         return data
    //     } catch (e) {
    //         log.error('[Error] previewSwapExactMarginalPrice', e)
    //         this.setPreviewPending(false)
    //         return {
    //             validSwap: false
    //         }

    //     }
    // }

}