/* eslint-disable @typescript-eslint/no-empty-interface */
import 'bootstrap/dist/css/bootstrap.min.css'

import { bns } from 'biggystring'
import React from 'react'
import { Button, Col, Form } from 'react-bootstrap'

import CONFIG from './../../config.json'

interface MainSceneState {
  reports: PartnerReferralReport[]
  partners: PartnerObject[]
  startDate: string
  endDate: string
  currencyCodes: CurrencyCodes
  allChecked: boolean
}

interface CurrencyCodes {
  BTC: CurrencyInfo
  BCH: CurrencyInfo
  ETH: CurrencyInfo
  XRP: CurrencyInfo
}

interface CurrencyInfo {
  rate: string
  div: string
  type: string
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

export class MainScene extends React.Component<{}, MainSceneState> {
  payoutArray: UpdatePayout[] = []
  constructor(props) {
    super(props)
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
            payoutAddress: 'string',
            payoutCurrency: 'string'
          }
        },
        {
          totalEarned: 1,
          installerConversionCount: 1,
          installerSignupCount: 1,
          payouts: [
            {
              date: '2020-02-20T00:00:00.000Z',
              dollarValue: 0.1,
              currencyCode: 'ETH',
              nativeAmount: '1000000000',
              isAdjustment: false
            }
          ],
          installerConversions: {},
          checked: false,
          apiKey: '',
          amountOwed: 0,
          incentive: {
            payoutAddress: 'string',
            payoutCurrency: 'string'
          }
        }
      ],
      partners: [{ apiKey: 'key 1' }, { apiKey: 'key 2' }],
      startDate: '',
      endDate: '',
      currencyCodes: {
        BTC: {
          rate: '0',
          div: '100000000',
          type: 'bitcoin'
        },
        BCH: {
          rate: '0',
          div: '100000000',
          type: 'bitcoincash'
        },
        ETH: {
          rate: '0',
          div: '1000000000000000000',
          type: 'ethereum'
        },
        XRP: {
          rate: '0',
          div: '1000000',
          type: 'ripple'
        }
      },
      allChecked: false
    }
  }

  getSummaryAsync = async (
    startDate: string,
    endDate: string
  ): Promise<void> => {
    try {
      const json: PartnerObject[] = await fetch(
        'https://util1.edge.app/api/v1/partner/list?masterKey=' +
          CONFIG.masterKey
      ).then(response => response.json())
      const partners = json.map(partner => ({
        apiKey: partner.apiKey
      }))
      this.setState({ partners })
      const promises: Array<Promise<PartnerReferralReport>> = []
      for (const partner of partners) {
        if (partner.apiKey != null) {
          const promise = fetch(
            'https://dl.edge.app/api/v1/partner/revenue?apiKey=' +
              partner.apiKey +
              '&startDate=' +
              startDate +
              '&endDate=' +
              endDate,
            { method: 'GET' }
          )
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
      const exchangeRates: CurrencyCodes = this.state.currencyCodes
      for (const code of Object.keys(exchangeRates)) {
        const getRate: any = await fetch(
          'https://info1.edgesecure.co:8444/v1/exchangeRate?currency_pair=' +
            code +
            '_USD&date=' +
            this.state.endDate
        ).then(response => response.json())
        exchangeRates[code].rate = getRate.exchangeRate
      }
      this.setState({ currencyCodes: exchangeRates })
    } catch (e) {
      console.log(e)
    }
  }

  putPayout = async (payoutArray: UpdatePayout[]): Promise<void> => {
    try {
      await fetch(
        'https://util1.edge.app/api/v1/partner/payouts/?&masterKey=' +
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
      if (report.checked === true) {
        // Pays only the checked referral partners who have a payoutaddress and currency
        if (
          typeof report.incentive.payoutCurrency === 'string' &&
          typeof report.incentive.payoutAddress === 'string'
        ) {
          const amountOwedString = report.amountOwed.toString()
          const payoutCurrency = report.incentive.payoutCurrency
          const rateString = this.state.currencyCodes[payoutCurrency].rate
          const currencyDivider = this.state.currencyCodes[payoutCurrency].div
          const currencyType = this.state.currencyCodes[payoutCurrency].type
          console.log('ratestring', rateString)
          // Creates a new payout object to update the database
          const newPayout: Payout = {
            date: new Date().toISOString(),
            dollarValue: report.amountOwed,
            currencyCode: payoutCurrency,
            nativeAmount: bns.div(
              bns.mul(amountOwedString, currencyDivider),
              rateString,
              16
            ),
            isAdjustment: true
          }
          // Calls the make payment function with amount, wallet type, and payoutaddress
          this.makePayment(
            newPayout.nativeAmount,
            currencyType,
            report.incentive.payoutAddress
          )
          payoutArray.push({ apiKey: report.apiKey, payout: newPayout })
        }
      }
      return report
    })
    // Calls the putPayout function with payoutArray as an argument
    this.putPayout(payoutArray).catch(e => {
      console.log(e)
    })
    // Resets payout array to empty, updates reports
    this.getSummaryAsync(this.state.startDate, this.state.endDate).catch(e => {
      console.log(e)
    })
    console.log(this.payoutArray)
  }

  makePayment = (
    nativeAmount: string,
    currencyType: string,
    publicAddress: string
  ): void => {
    console.log(
      'makePayment was called',
      this.payoutArray,
      currencyType,
      nativeAmount,
      publicAddress
    )
  }

  //     try {
  //       await fetch('http://localhost:8008/spend/?type=' + type,
  //       {
  //         body: JSON.stringify({spendTargets: [{ nativeAmount, publicAddress }]},
  //           headers: {
  //             'Content-Type': 'application/json'
  //           },
  //           method: 'POST'
  //       }
  //         )
  //       )
  //     } catch (e) {
  //       console.log(e)
  //     }

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

  render(): React.ReactNode {
    const { startDate, endDate, reports, allChecked } = this.state
    return (
      <div className="text-center">
        <h1> Edge Referral Manager </h1>
        <p>
          Load a summary of payments by referral partner APIkey and make a
          payments to referral partners.
        </p>
        <Form className="container">
          <Form.Row className="row justify-content-center">
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
          </Form.Row>
        </Form>

        <Button
          variant="primary"
          type="submit"
          onClick={this.handleSummaryClick}
          size="lg"
        >
          Get a Summary
        </Button>

        <div className="container">
          <table role="form" className="table table-responsive text-centered">
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
                  </tr>
                </tbody>
              )
            })}
          </table>
        </div>
        <Button
          variant="primary"
          type="submit"
          onClick={this.handlePayoutClick}
        >
          Pay Selected Referral Partners
        </Button>
      </div>
    )
  }
}
