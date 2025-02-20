const request = require('supertest')
const assert = require('chai').assert
const axios = require('axios')
const { isArray } = require('lodash')

const addresses = require('../../src/lib/data/addresses.json')
const initDb = require('../../src/lib/db')
const { Cache, clearAllDataTestOnly } = require('../../src/lib/db/models/cache')

const app = require('../../src/runtime/app')
const { sleep, assertValidPositiveNumber, assertArraySize } = require('./utils')
const harvestKey = 'harvest-key'
const testPort = 3030
const { tokens: tokensJson, pools: poolsJson } = require('../../data/index.js')

describe('Happy Paths', function () {
  let appServer, allVaultsJsonArray, activeVaultsJsonArray
  before(async function () {
    await initDb()
    await clearAllDataTestOnly(Cache)

    allVaultsJsonArray = Object.keys(tokensJson)
      .filter(token => tokensJson[token].vaultAddress)
      .map(token => tokensJson[token])

    activeVaultsJsonArray = allVaultsJsonArray.filter(
      item =>
        !item.inactive &&
        !(
          !isArray(item.tokenAddress) &&
          item.tokenAddress.toLowerCase() === addresses.iFARM.toLowerCase()
        ),
    )

    appServer = app(testPort)

    let response = {
      data: {},
    }
    while (Object.keys(response.data).length < 3) {
      response = await axios.get(`http://localhost:${testPort}/cmc?key=${harvestKey}`)
      console.log('Still loading. Waiting...')
      await sleep(10000)
    }

    console.log('Loaded. Running tests...')
  })

  after(async function () {
    appServer.close()
    console.log('Tested completed.')
  })

  describe('Internal ACTIVE_ENDPOINTS', function () {
    it('queries /vaults', function () {
      return request(`http://localhost:${testPort}`)
        .get(`/vaults?key=${harvestKey}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          assert.exists(res.body.matic)
          assert.exists(res.body.eth)
          assert.exists(res.body.bsc)
          assert.equal(
            Object.keys(res.body.matic).length +
              Object.keys(res.body.eth).length +
              Object.keys(res.body.bsc).length,
            allVaultsJsonArray.length,
          )
        })
    })

    it('queries /pools', function () {
      return request(`http://localhost:${testPort}`)
        .get(`/pools?key=${harvestKey}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          assert(res.body.matic)
          assert(res.body.eth)
          assert(res.body.bsc)
          assert.equal(
            res.body.matic.length + res.body.eth.length + res.body.bsc.length,
            poolsJson.length,
          )
        })
    })
  })

  describe('External ACTIVE_ENDPOINTS', () => {
    it('queries /token-stats', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/token-stats?key=${harvestKey}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          assertValidPositiveNumber(res.body.percentStaked)
          assertValidPositiveNumber(res.body.historicalAverageProfitSharingAPY)
          assertValidPositiveNumber(res.body.totalGasSaved)
          assertValidPositiveNumber(res.body.totalMarketCap)
          assertValidPositiveNumber(res.body.monthlyProfits)
        })
    })

    it('queries /revenue/total', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/revenue/total?key=${harvestKey}`)
        .expect('Content-Type', /text/)
        .expect(200)
        .then(res => {
          assertValidPositiveNumber(res.text)
        })
    })

    it('queries /revenue/{token}', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/revenue/DAI?key=${harvestKey}`)
        .expect('Content-Type', /text/)
        .expect(200)
        .then(res => {
          assertValidPositiveNumber(res.text)
        })
    })

    it('queries /gmv/total', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/gmv/total?key=${harvestKey}`)
        .expect('Content-Type', /text/)
        .expect(200)
        .then(res => {
          assertValidPositiveNumber(res.text)
        })
    })

    it('queries /gmv/{token}', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/gmv/DAI?key=${harvestKey}`)
        .expect('Content-Type', /text/)
        .expect(200)
        .then(res => {
          assertValidPositiveNumber(res.text)
        })
    })

    it('queries /cmc', () => {
      return request(`http://localhost:${testPort}`)
        .get(`/cmc?key=${harvestKey}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(res => {
          assertArraySize(res.body.links, 6) // links/socials
          assertArraySize(res.body.pools, activeVaultsJsonArray.length + 3) // pools must contain all active vaults + 3 special pools
        })
    })
  })
})
