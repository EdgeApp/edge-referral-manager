/* eslint-disable @typescript-eslint/no-empty-interface */
import 'bootstrap/dist/css/bootstrap.min.css'

import { div, mul, toFixed } from 'biggystring'
import React from 'react'
import { Button, Col, Form, Row } from 'react-bootstrap'

import CONFIG from './../../config.json'

interface MainSceneState {
  reports: PartnerReferralReport[]
  partners: PartnerObject[]
  startDate: string
  endDate: string
  rates: Rates
  allChecked: boolean
  offlineApiKey: string
  offlineDollarValue: string
  offlineCurrencyCode: string
}

interface Rates {
  BTC: string
  BCH: string
  ETH: string
  XRP: string
}

interface PartnerObject {
  apiKey?: string
}

interface PartnerReferralReport {
  payouts: Payout[]
  totalEarned: number
  installerConversionCount: number
  installerSignupCount: number
  installerConversions: {}
  amountOwed: number
  apiKey: string
  checked: boolean
  incentive: {
    payoutAddress: string
    payoutCurrency: string
  }
}

interface Payout {
  date: string
  dollarValue: number
  currencyCode: string
  nativeAmount: string
  isAdjustment: boolean
  apiKey?: string
}

interface UpdatePayout {
  apiKey: string
  payout: Payout
}

const currencyInfo = {
  BTC: {
    div: '100000000',
    type: 'bitcoin',
    batchSize: 10,
    spendTargets: []
  },
  BCH: {
    div: '100000000',
    type: 'bitcoincash',
    batchSize: 10,
    spendTargets: []
  },
  ETH: {
    div: '1000000000000000000',
    type: 'ethereum',
    batchSize: 1,
    spendTargets: []
  },
  XRP: {
    div: '1000000',
    type: 'ripple',
    batchSize: 1,
    spendTargets: []
  }
}

export class MainScene extends React.Component<{}, MainSceneState> {
  payoutArray: UpdatePayout[] = []
  constructor(props) {
    super(props)
    // first day of the month
    var today = new Date()
    var lastMonth = new Date(today.setUTCMonth(today.getMonth() - 1))
    var firstDay = new Date(lastMonth.setDate(1))
    var startDateString = firstDay.toISOString()
    var startDate = startDateString.split('T')[0]
    // last day of the month
    var lastMonth2 = new Date()
    var lastDay = new Date(lastMonth2.setDate(1))
    var endDateString = lastDay.toISOString()
    var endDate = endDateString.split('T')[0]
    this.state = {
      reports: [
        {
          payouts: [],
          totalEarned: 0,
          installerConversionCount: 0,
          installerSignupCount: 0,
          installerConversions: {},
          checked: false,
          apiKey: '',
          amountOwed: 0,
          incentive: {
            payoutAddress: '',
            payoutCurrency: ''
          }
        }
      ],
      partners: [{ apiKey: 'key 1' }, { apiKey: 'key 2' }],
      startDate,
      endDate,
      rates: {
        BTC: '0',
        BCH: '0',
        ETH: '0',
        XRP: '0'
      },
      allChecked: false,
      offlineApiKey: '',
      offlineDollarValue: '0',
      offlineCurrencyCode: ''
    }
  }

  getSummaryAsync = async (
    startDate: string,
    endDate: string
  ): Promise<void> => {
    try {
      const json: PartnerObject[] = await fetch(
        'https://util2.edge.app/api/v1/partner/list?masterKey=' +
          CONFIG.masterKey
      ).then(response => response.json())
      const partners = json.map(partner => ({
        apiKey: partner.apiKey
      }))
      this.setState({ partners })
      const promises: Array<Promise<PartnerReferralReport>> = []
      for (const partner of partners) {
        if (partner.apiKey != null) {
          let uri =
            'https://util2.edge.app/api/v1/partner/revenue?apiKey=' +
            partner.apiKey
          if (startDate !== '') {
            uri += '&startDate=' + startDate
          }
          if (endDate !== '') {
            uri += '&endDate=' + endDate
          }
          const promise = fetch(uri, { method: 'GET' })
            .then(response => response.json())
            .then(jsonResponse => ({
              ...jsonResponse,
              apiKey: partner.apiKey,
              checked: false
            }))
          promises.push(promise)
        }
      }
      const partnerReports = await Promise.all(promises)
      for (const report of partnerReports) {
        report.checked = false
        let remainder: number = report.totalEarned
        if (report.payouts.length > 0) {
          for (let i = 0; i < report.payouts.length; i++) {
            if (remainder > 0) {
              remainder -= report.payouts[i].dollarValue
            } else if (remainder <= 0) {
              remainder = 0
            }
          }
        }
        report.amountOwed = parseFloat(remainder.toFixed(2))
      }
      this.setState({ reports: partnerReports })

      // Get Exchange Rates for supported payout currencies
      const exchangeRates: Rates = this.state.rates
      const today: string = new Date().toISOString()
      for (const code of Object.keys(exchangeRates)) {
        const getRate: any = await fetch(
          'https://rates1.edge.app/v1/exchangeRate?currency_pair=' +
            code +
            '_USD&date=' +
            today
        ).then(response => response.json())
        exchangeRates[code] = getRate.exchangeRate
      }
      this.setState({ rates: exchangeRates })
    } catch (e) {
      console.log(e)
    }
  }

  putPayout = async (payoutArray: UpdatePayout[]): Promise<void> => {
    console.log('put payout click was called', this.payoutArray)
    try {
      await fetch(
        'https://util2.edge.app/api/v1/partner/payouts/?&masterKey=' +
          CONFIG.masterKey,
        {
          body: JSON.stringify(payoutArray),
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'PUT'
        }
      ).then(response => {
        if (response.ok) {
          return this.getSummaryAsync(
            this.state.startDate,
            this.state.endDate
          ).catch(e => {
            console.log(e)
          })
        }
      })
    } catch (e) {
      console.log(e)
    }
  }

  handlePayoutClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    // Creates an array of all payouts that need to be made to selected referral partners
    const payoutArray = this.payoutArray
    this.state.reports.map(report => {
      // Pays only the referral partners who have checkboxes
      if (report.checked === true && report.amountOwed > 0) {
        // Pays only the checked referral partners who have a payoutaddress and currency
        if (
          typeof report.incentive.payoutCurrency === 'string' &&
          typeof report.incentive.payoutAddress === 'string'
        ) {
          const amountOwedString = report.amountOwed.toString()
          const payoutCurrency = report.incentive.payoutCurrency
          const rateString = this.state.rates[payoutCurrency]
          const currencyDivider = currencyInfo[payoutCurrency].div
          console.log('ratestring', rateString)
          // Creates a new payout object to update the database
          const newPayout: Payout = {
            date: new Date().toISOString(),
            dollarValue: report.amountOwed,
            currencyCode: payoutCurrency,
            nativeAmount: toFixed(
              div(
                mul(amountOwedString, currencyDivider),
                rateString,
                16
              ),
              0,
              0
            ),
            isAdjustment: false
          }
          payoutArray.push({ apiKey: report.apiKey, payout: newPayout })
          currencyInfo[payoutCurrency].spendTargets.push({
            nativeAmount: amountOwedString,
            publicAddress: report.incentive.payoutAddress
          })
        }
      }
      return report
    })
    // Batches payments according to batchSize and sends to makePayment
    for (const code of Object.keys(currencyInfo)) {
      let index = currencyInfo[code].spendTargets.length
      while (index > 0) {
        const spend: string[] = []
        for (let i = 0; i < currencyInfo[code].batchSize; i++) {
          spend.push(currencyInfo[code].spendTargets.shift())
          if (currencyInfo[code].spendTargets.length === 0) {
            break
          }
        }
        this.makePayment(currencyInfo[code].type, spend).catch(e => {
          console.log(e)
        })
        index -= currencyInfo[code].batchSize
        console.log('spend' + code + JSON.stringify(spend))
      }
    }
    // Calls the putPayout function with payoutArray as an argument
    this.putPayout(payoutArray).catch(e => {
      console.log(e)
    })
    // Resets payout array to empty, updates reports
    this.getSummaryAsync(this.state.startDate, this.state.endDate).catch(e => {
      console.log(e)
    })
    console.log('handle payout click was called', this.payoutArray)
  }

  makePayment = async (
    currencyType: string,
    spendTargets: string[]
  ): Promise<void> => {
    try {
      await fetch('/spend/?type=' + currencyType, {
        body: JSON.stringify({
          spendTargets
        }),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST'
      })
    } catch (e) {
      console.log(e)
    }
  }

  handleOfflineClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    // Creates an array of all payouts that need to be made to selected referral partners
    const amountOwedString = this.state.offlineDollarValue
    const apiKey = this.state.offlineApiKey
    const payoutCurrency = this.state.offlineCurrencyCode
    const rateString = this.state.rates[payoutCurrency]
    const currencyDivider = currencyInfo[payoutCurrency].div
    const payoutArray: UpdatePayout[] = [
      {
        apiKey: apiKey,
        payout: {
          date: new Date().toISOString(),
          dollarValue: parseFloat(this.state.offlineDollarValue),
          currencyCode: payoutCurrency,
          nativeAmount: toFixed(
            div(mul(amountOwedString, currencyDivider), rateString, 16),
            0,
            0
          ),
          isAdjustment: true
        }
      }
    ]
    // Calls the putPayout function with payoutArray as an argument
    this.putPayout(payoutArray).catch(e => {
      console.log(e)
    })
    console.log('handle offline payout click was called', payoutArray)
    this.setState({
      offlineApiKey: '',
      offlineCurrencyCode: '',
      offlineDollarValue: '0'
    })
    console.log('setState was called', payoutArray)
  }

  handleAllClick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    let allChecked = event.target.checked
    if (allChecked === false) {
      const reports: PartnerReferralReport[] = this.state.reports.map(
        report => {
          report.checked = false
          allChecked = false
          return report
        }
      )
      this.setState({ reports, allChecked })
    } else {
      const reports: PartnerReferralReport[] = this.state.reports.map(
        report => {
          report.amountOwed > 0
            ? (report.checked = true)
            : (report.checked = false)
          allChecked = true
          return report
        }
      )
      this.setState({ reports, allChecked })
    }
    console.log('Handle All', this.state.reports, this.state.allChecked)
  }

  handleCheckClick = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const apiKey = event.target.name
    const reports: PartnerReferralReport[] = this.state.reports.map(report => {
      if (report.apiKey === apiKey) {
        report.checked = !report.checked
      }
      return report
    })
    this.setState({ reports })
    console.log('Handle Check One', this.state.reports)
  }

  handleSummaryClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    this.getSummaryAsync(this.state.startDate, this.state.endDate).catch(e => {
      console.log(e)
    })
    console.log('Summary click called', this.state.reports)
  }

  handleStartDateChange = (event: any): void => {
    const startDate = event.target.value
    this.setState({ startDate })
  }

  handleEndDateChange = (event: any): void => {
    const endDate = event.target.value
    this.setState({ endDate })
  }

  handleOfflineDollarChange = (event: any): void => {
    const offlineDollarValue = event.target.value
    this.setState({ offlineDollarValue })
  }

  handleOfflineApiKey = (event: any): void => {
    const offlineApiKey = event.target.value
    this.setState({ offlineApiKey })
  }

  handleOfflineCurrencyCode = (event: any): void => {
    const offlineCurrencyCode = event.target.value
    this.setState({ offlineCurrencyCode })
  }

  render(): React.ReactNode {
    const {
      startDate,
      endDate,
      reports,
      allChecked,
      rates,
      offlineDollarValue,
      offlineApiKey,
      offlineCurrencyCode
    } = this.state
    return (
      <div className="py-3 text-center">
        <h1> Edge Referral Manager </h1>
        <p>
          Load a summary of payments by referral partner APIkey and make a
          payments to referral partners.
        </p>
        <Form className="pt-5 container">
          <Row className="row justify-content-center">
            <Col>
              <Form.Label>Start Date</Form.Label>
              <Form.Control
                type="text"
                name="startDate"
                value={startDate}
                onChange={this.handleStartDateChange}
              />
              <Form.Text className="text-muted">
                Please enter a start date.
              </Form.Text>
            </Col>
            <Col>
              <Form.Label>End Date</Form.Label>
              <Form.Control
                type="text"
                name="endDate"
                value={endDate}
                onChange={this.handleEndDateChange}
              />
              <Form.Text className="text-muted">
                Please enter an end date.
              </Form.Text>
            </Col>
          </Row>
        </Form>

        <Button
          variant="primary"
          type="submit"
          onClick={this.handleSummaryClick}
          size="lg"
        >
          Get a Summary
        </Button>

        <div className="pt-5 pb-3 container">
          <table role="form" className="table table-fit text-centered">
            <thead className="thead-dark">
              <tr>
                <th className="checkbox">
                  <input
                    type="checkbox"
                    className="check"
                    id="checkAll"
                    checked={allChecked}
                    onChange={this.handleAllClick}
                  />
                  Select All
                </th>
                <th>ID:</th>
                <th>Installer Conversion Count:</th>
                <th>Installer SignUp Count:</th>
                <th>Amount Owed:</th>
                <th>Total Earned:</th>
                <th>Crypto Amount:</th>
                <th>Payout Address:</th>
              </tr>
            </thead>
            {reports.map((report: PartnerReferralReport, index) => {
              if (report == null || report.installerConversions == null) {
                return ''
              }
              const name = Object.keys(report.installerConversions)
              return (
                <tbody key={index}>
                  <tr>
                    <th className="checkbox">
                      {report.amountOwed > 0 ? (
                        <input
                          type="checkbox"
                          className="check"
                          aria-label="Checkbox for following text input"
                          checked={report.checked}
                          onChange={this.handleCheckClick}
                          name={report.apiKey}
                        />
                      ) : (
                        <input
                          type="checkbox"
                          className="check"
                          aria-label="Checkbox for following text input"
                          checked={report.checked}
                          onChange={this.handleCheckClick}
                          name={report.apiKey}
                          disabled
                        />
                      )}
                    </th>
                    <td>{name[0]}</td>
                    <td>{report.installerConversionCount}</td>
                    <td>{report.installerSignupCount}</td>
                    <td>{report.amountOwed}</td>
                    <td>{report.totalEarned.toFixed(2)}</td>
                    <td>
                      {report.amountOwed > 0 &&
                      typeof report.incentive.payoutCurrency === 'string'
                        ? (
                            report.amountOwed /
                            rates[report.incentive.payoutCurrency]
                          ).toFixed(2) +
                          ' ' +
                          report.incentive.payoutCurrency
                        : ''}
                    </td>
                    <td>
                      {typeof report.incentive.payoutAddress === 'string'
                        ? report.incentive.payoutAddress.substring(0, 6)
                        : ''}
                    </td>
                  </tr>
                </tbody>
              )
            })}
          </table>
          <table role="form" className="table table-fit text-centered">
            <thead className="thead-dark">
              <tr>
                <th>BTC</th>
                <th>BCH</th>
                <th>ETH</th>
                <th>XRP</th>
              </tr>
            </thead>
            {this.renderSumArea()}
          </table>
        </div>
        <Button
          variant="primary"
          type="submit"
          onClick={this.handlePayoutClick}
        >
          Pay Selected Referral Partners
        </Button>
        <div>
          <h4 className="pt-5"> Make an Offline Adjustment</h4>
          <p>
            {' '}
            The referral partner will not receive a direct payment, but a
            payment will be added to the payout records.{' '}
          </p>
          <Form className="container">
            <Row className="row justify-content-center">
              <Col>
                <Form.Label>Amount Owed</Form.Label>
                <Form.Control
                  type="text"
                  name="dollarValue"
                  value={offlineDollarValue}
                  onChange={this.handleOfflineDollarChange}
                />
                <Form.Text className="text-muted">
                  Please enter the amount owed in dollar value.
                </Form.Text>
              </Col>
              <Col>
                <Form.Label>API Key</Form.Label>
                <Form.Control
                  type="text"
                  name="endDate"
                  value={offlineApiKey}
                  onChange={this.handleOfflineApiKey}
                />
                <Form.Text className="text-muted">
                  Please enter the API key of the referral partner.
                </Form.Text>
              </Col>
              <Col>
                <Form.Label>Currency Code</Form.Label>
                <Form.Control
                  type="text"
                  name="endDate"
                  value={offlineCurrencyCode}
                  onChange={this.handleOfflineCurrencyCode}
                />
                <Form.Text className="text-muted">
                  Please enter the currency code of the referral partner.
                </Form.Text>
              </Col>
            </Row>
          </Form>
          <Button
            variant="primary"
            type="submit"
            onClick={this.handleOfflineClick}
          >
            Make an offline payment
          </Button>
        </div>
      </div>
    )
  }

  renderSumArea(): React.ReactNode {
    const { reports, rates } = this.state
    var sumBTC = 0
    var sumBCH = 0
    var sumETH = 0
    var sumXRP = 0
    for (const report of reports) {
      if (
        report.incentive.payoutCurrency === 'BTC' &&
        report.checked === true
      ) {
        sumBTC +=
          report.amountOwed / parseFloat(rates[report.incentive.payoutCurrency])
      }
    }
    for (const report of reports) {
      if (
        report.incentive.payoutCurrency === 'BCH' &&
        report.checked === true
      ) {
        sumBCH +=
          report.amountOwed / parseFloat(rates[report.incentive.payoutCurrency])
      }
    }
    for (const report of reports) {
      if (
        report.incentive.payoutCurrency === 'ETH' &&
        report.checked === true
      ) {
        sumETH +=
          report.amountOwed / parseFloat(rates[report.incentive.payoutCurrency])
      }
    }
    for (const report of reports) {
      if (
        report.incentive.payoutCurrency === 'XRP' &&
        report.checked === true
      ) {
        sumXRP +=
          report.amountOwed / parseFloat(rates[report.incentive.payoutCurrency])
      }
    }
    return (
      <tbody>
        <tr>
          <td>{sumBTC.toFixed(2)}</td>
          <td>{sumBCH.toFixed(2)}</td>
          <th>{sumETH.toFixed(2)}</th>
          <th>{sumXRP.toFixed(2)}</th>
        </tr>
      </tbody>
    )
  }
}
