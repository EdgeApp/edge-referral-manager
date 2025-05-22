import bodyParser from 'body-parser'
import cors from 'cors'
import {
  addEdgeCorePlugins,
  EdgeAccount,
  EdgeContext,
  EdgeCurrencyWallet,
  EdgeSpendInfo,
  EdgeTransaction,
  lockEdgeCorePlugins,
  makeEdgeContext,
  EdgeCorePluginOptions,
  EdgeCorePlugins,
  JsonObject
} from 'edge-core-js'
import { makeCurrencyPlugin } from 'edge-currency-plugins/lib/common/plugin/CurrencyPlugin'
import { all } from 'edge-currency-plugins/lib/common/utxobased/info/all'
import express from 'express'
import { CONFIG } from './envConfig'

const plugins: EdgeCorePlugins = {}
for (const info of all) {
  const initOptions: JsonObject | boolean = CONFIG.PLUGINS[info.currencyInfo.pluginId]
  if (initOptions !== false) {
    plugins[info.currencyInfo.pluginId] = (options: EdgeCorePluginOptions) => {
      options.nativeIo = {
        'edge-currency-plugins': {
          memletConfig: {
            maxMemoryUsage: 50 * 1024 * 1024 // 50MB
          }
        }
      }
      options.initOptions = initOptions === true ? {} : initOptions
      return makeCurrencyPlugin(options, info)
    }
  }
}
addEdgeCorePlugins(plugins)
lockEdgeCorePlugins()

async function main(): Promise<void> {
  const app = express()

  // Start the core, with Bitcoin enabled:
  const context: EdgeContext = await makeEdgeContext({
    apiKey: CONFIG.API_KEY,
    apiSecret: CONFIG.API_SECRET,
    appId: CONFIG.APP_ID,
    plugins: CONFIG.PLUGINS
  })

  // Log in to some user:
  const account: EdgeAccount = await context.loginWithPassword(
    CONFIG.USERNAME,
    CONFIG.PASSWORD
  )

  app.use(bodyParser.json({ limit: '1mb' }))
  app.use(cors())
  app.use('/', express.static('dist'))

  // Getting wallet balances based on type of wallet
  app.get('/balances/', async (req, res, next) => {
    const type = req.query.type
    const walletInfo = account.getFirstWalletInfo(`wallet:${type}`)
    if (walletInfo == null) {
      res.status(404).send(`${type} is invalid`)
      return
    }
    try {
      const wallet: EdgeCurrencyWallet = await account.waitForCurrencyWallet(
        walletInfo.id
      )
      res.json(wallet.balances)
    } catch (e) {
      res.status(500).send('Server error in waitForCurrencyWallet')
    }
  })

  // Get wallet transactions based on type of wallet
  app.get('/transactions/', async (req, res, next) => {
    const type = req.query.type
    const walletInfo = account.getFirstWalletInfo(`wallet:${type}`)
    if (walletInfo == null) {
      res.status(404).send(`${type} is invalid`)
      return
    }
    try {
      const wallet: EdgeCurrencyWallet = await account.waitForCurrencyWallet(
        walletInfo.id
      )
      const transactions: EdgeTransaction[] = await wallet.getTransactions({
        tokenId: null
      })
      res.send(transactions)
    } catch (e) {
      res.status(500).send('Server error in waitForCurrencyWallet')
    }
  })

  app.post('/spend/', async (req, res, next) => {
    const type = req.query.type
    const spendInfo: EdgeSpendInfo = req.body
    const walletInfo = account.getFirstWalletInfo(`wallet:${type}`)
    if (walletInfo == null) {
      res.status(404).send(`${type} is invalid`)
      return
    }
    const wallet: EdgeCurrencyWallet = await account.waitForCurrencyWallet(
      walletInfo.id
    )
    let edgeTransaction: EdgeTransaction
    try {
      edgeTransaction = await wallet.makeSpend(spendInfo)
    } catch (e) {
      res.status(400).send('Body does not match EdgeSpendInfo specification')
      return
    }
    try {
      const signedTx = await wallet.signTx(edgeTransaction)
      await wallet.broadcastTx(signedTx)
      await wallet.saveTx(signedTx)
      res.send(signedTx)
    } catch (e) {
      res.status(500).send('Internal server error')
    }
  })

  app.listen(CONFIG.HTTP_PORT, () => {
    console.log('Server is listening on:', CONFIG.HTTP_PORT)
  })
}
main().catch(e => {
  console.error(e)
  process.exit(1)
})
