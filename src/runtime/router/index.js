const { API_KEY, ENDPOINT_TYPES, ACTIVE_ENDPOINTS, DB_CACHE_IDS } = require('../../lib/constants')
const { validateAPIKey, asyncWrap, validateTokenSymbol } = require('./middleware')
const { Cache } = require('../../lib/db/models/cache')
const { get } = require('lodash')
const { default: BigNumber } = require('bignumber.js')

const initRouter = app => {
  app.use(validateAPIKey(API_KEY))

  if (ACTIVE_ENDPOINTS === ENDPOINT_TYPES.ALL || ACTIVE_ENDPOINTS === ENDPOINT_TYPES.EXTERNAL) {
    app.get(
      '/revenue/total',
      asyncWrap(async (req, res) => {
        const dbField = 'data.totalRevenue'
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/revenue/monthly',
      asyncWrap(async (req, res) => {
        const dbField = 'data.monthlyRevenue'
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/gmv/total',
      asyncWrap(async (req, res) => {
        const dbField = 'data.totalGmv'
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/token-stats',
      asyncWrap(async (req, res) => {
        const dbField = 'data.tokenStats'
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, {}))
      }),
    )

    app.get(
      '/revenue/_debug',
      asyncWrap(async (req, res) => {
        const results = {}

        const allVaults = await Cache.findOne({ type: DB_CACHE_IDS.VAULTS })
        const allStats = await Cache.findOne({ type: DB_CACHE_IDS.STATS })

        for (let chainName of Object.keys(allVaults.data)) {
          results[chainName] = Object.keys(allVaults.data[chainName]).map(name => {
            const vault = get(allVaults, `data.[${chainName}][${name}]`, {})
            const tvl = new BigNumber(vault.underlyingBalanceWithInvestment)
              .dividedBy(new BigNumber(10).pow(18))
              .times(vault.usdPrice)
              .toFixed(2)
            const yearlyApy = get(allStats, `data.apyList.${name}`, 0)
            const dailyApr = Math.pow(Number(yearlyApy / 100) + 1, 1 / 365) - 1
            const monthlyApy = ((Math.pow(1 + dailyApr, 30) - 1) * 100).toString()
            const yearlyProfit = get(allStats, `data.revenueList.${name}`, 0)
            const monthlyProfit = get(allStats, `data.revenueListMonthly.${name}`, 0)
            const percentageOfMonthlyRevenue = new BigNumber(monthlyProfit)
              .dividedBy(get(allStats, 'data.monthlyRevenue', 1))
              .times(100)
              .toFixed()

            return {
              name,
              tvl,
              yearlyApy,
              monthlyApy: monthlyApy.toString(),
              dailyApr: dailyApr.toString(),
              percentageOfMonthlyRevenue,
              yearlyProfit,
              monthlyProfit,
            }
          })
        }

        res.send(results)
      }),
    )

    app.get(
      '/revenue/:symbol',
      validateTokenSymbol,
      asyncWrap(async (req, res) => {
        const tokenSymbol = req.params.symbol.toUpperCase()

        const dbField = `data.revenueList.${tokenSymbol}`
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/apy/:symbol',
      validateTokenSymbol,
      asyncWrap(async (req, res) => {
        const tokenSymbol = req.params.symbol.toUpperCase()

        const dbField = `data.apyList.${tokenSymbol}`
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/gmv/:symbol',
      validateTokenSymbol,
      asyncWrap(async (req, res) => {
        const tokenSymbol = req.params.symbol.toUpperCase()

        const dbField = `data.gmvList.${tokenSymbol}`
        const queryResponse = await Cache.findOne({ type: DB_CACHE_IDS.STATS }, { [dbField]: 1 })
        res.send(get(queryResponse, dbField, '0'))
      }),
    )

    app.get(
      '/cmc',
      asyncWrap(async (req, res) => {
        const cmcData = await Cache.findOne({ type: DB_CACHE_IDS.CMC })
        res.send(get(cmcData, 'data', {}))
      }),
    )
  }

  if (ACTIVE_ENDPOINTS === ENDPOINT_TYPES.ALL || ACTIVE_ENDPOINTS === ENDPOINT_TYPES.INTERNAL) {
    app.get(
      '/pools',
      asyncWrap(async (req, res) => {
        const allPools = await Cache.findOne({ type: DB_CACHE_IDS.POOLS })
        const uiData = await Cache.findOne(
          { type: DB_CACHE_IDS.UI_DATA },
          { 'data.pools.updatedAt': 1 },
        )
        res.send({
          updatedAt: {
            apiData: get(allPools, 'updatedAt'),
            uiData: get(uiData, 'data.pools.updatedAt'),
          },
          ...get(allPools, 'data', {}),
        })
      }),
    )

    app.get(
      '/vaults',
      asyncWrap(async (req, res) => {
        const allVaults = await Cache.findOne({ type: DB_CACHE_IDS.VAULTS })
        const uiData = await Cache.findOne(
          { type: DB_CACHE_IDS.UI_DATA },
          { 'data.tokens.updatedAt': 1 },
        )
        res.send({
          updatedAt: {
            apiData: get(allVaults, 'updatedAt'),
            uiData: get(uiData, 'data.tokens.updatedAt'),
          },
          ...get(allVaults, 'data', {}),
        })
      }),
    )
  }
}

module.exports = { initRouter }
