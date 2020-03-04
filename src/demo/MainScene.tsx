/* eslint-disable @typescript-eslint/no-empty-interface */
import 'bootstrap/dist/css/bootstrap.min.css'

import React from 'react'
import { Button, Form } from 'react-bootstrap'

import CONFIG from './../../config.json'

interface MainSceneState {
  reports: PartnerReferralReport[]
  partners: PartnerObject[]
  startDate: string
  endDate: string
  checked: boolean
  btcRate: number
}

interface PartnerObject {
  apiKey?: string
}

interface PartnerReferralReport {
  totalEarned: number
  installerConversionCount: number
  installerSignupCount: number
  installerConversions: {}
  payouts: Payout[]
  amountOwed?: number
}

interface Payout {
  date: string
  dollarValue: number
  currencyCode: string
  nativeAmount: string
  isAdjustment: boolean
}

export class MainScene extends React.Component<{}, MainSceneState> {
  constructor(props) {
    super(props)
    this.state = {
      reports: [
        {
          totalEarned: 0,
          installerConversionCount: 0,
          installerSignupCount: 0,
          payouts: [],
          installerConversions: {}
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
          installerConversions: {}
        }
      ],
      partners: [{ apiKey: 'key 1' }, { apiKey: 'key 2' }],
      startDate: '',
      endDate: '',
      checked: false,
      btcRate: '8500'
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
              apiKey: partner.apiKey
            }))
          promises.push(promise)
        }
      }
      const partnerReports = await Promise.all(promises)
      for (const report of partnerReports) {
        let remainder: number = report.totalEarned
        if (report.payouts.length > 0) {
          for (let i = 0; i < report.payouts.length; i++) {
            remainder -= report.payouts[i].dollarValue
          }
        }
        report.amountOwed = remainder
      }
      this.setState({ reports: partnerReports })
      const getRate: any = await fetch(
        'https://info1.edgesecure.co:8444/v1/exchangeRate?currency_pair=BTC_USD&date=' +
          this.state.endDate
      ).then(response => response.json())
      this.setState({ btcRate: parseFloat(getRate.exchangeRate) })
    } catch (e) {
      console.log(e)
    }
  }

  handleCheckClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    this.setState({ checked: !this.state.checked })
    console.log('Handle Check called', this.state.checked)
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
    const { startDate, endDate, reports } = this.state
    return (
      <div>
        <h1> Edge Referral Manager </h1>
        <p>
          Load a summary of payments by referral partner APIkey and make a
          payments to referral partners.
        </p>
        <Form>
          <Form.Group>
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
          </Form.Group>
        </Form>
        <Button
          variant="primary"
          type="submit"
          onClick={this.handleSummaryClick}
        >
          Get a Summary
        </Button>
        <div className="container">
          <table role="form" className="table table-responsive text-wrap">
            <thead className="thead-dark">
              <tr>
                <th className="checkbox">
                  <input
                    type="checkbox"
                    className="check"
                    id="checkAll"
                    onClick={this.handleCheckClick}
                    defaultChecked={this.state.checked}
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
                      <input
                        type="checkbox"
                        className="check"
                        aria-label="Checkbox for following text input"
                        onClick={this.handleCheckClick}
                        defaultChecked={this.state.checked}
                      />
                    </th>
                    <td>{name[0]}</td>
                    <td>{report.installerConversionCount}</td>
                    <td>{report.installerSignupCount}</td>
                    <td>{report.amountOwed}</td>
                    <td>{report.totalEarned}</td>
                  </tr>
                </tbody>
              )
            })}
          </table>
        </div>
        <Button variant="primary" type="submit">
          Pay Selected Referral Partners
        </Button>
      </div>
    )
  }
}
