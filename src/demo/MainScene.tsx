/* eslint-disable @typescript-eslint/no-empty-interface */
import 'bootstrap/dist/css/bootstrap.min.css'

import React from 'react'
import { Button, Form } from 'react-bootstrap'

import CONFIG from './../../config.json'

interface MainSceneState {
  keys: {
    totalEarned: number
    installerConversionCount: number
    installerSignupCount: number
  }
  partners: PartnerObject[]
  startDate: string
  endDate: string
}

interface PartnerObject {
  apiKey?: string
}

export class MainScene extends React.Component<{}, MainSceneState> {
  constructor(props) {
    super(props)
    this.state = {
      keys: {
        totalEarned: 0,
        installerConversionCount: 0,
        installerSignupCount: 0
      },
      partners: [{ apiKey: 'key 1' }, { apiKey: 'key 2' }],
      startDate: '',
      endDate: ''
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
      partners.map(async key => {
        if (key.apiKey != null) {
          const json2 = await fetch(
            'https://dl.edge.app/api/v1/partner/revenue?apiKey=' +
              key.apiKey +
              '&startDate=' +
              startDate +
              '&endDate=' +
              endDate,
            { method: 'GET' }
          ).then(response => response.json())
          this.setState({ keys: json2 })
        }
      })
    } catch (e) {
      console.log(e)
    }
  }

  handleSummaryClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    this.getSummaryAsync(this.state.startDate, this.state.endDate).catch(e => {
      console.log(e)
    })
    console.log('Summary click called', this.state.keys)
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
    const { startDate, endDate, partners, keys } = this.state
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
        <div>
          <div>{JSON.stringify(partners)}</div>
          <div>{JSON.stringify(keys)}</div>
          <table className="table table-responsive text-wrap">
            <thead className="thead-dark">
              <tr>
                <th>CheckBox</th>
                <th>ID:</th>
                <th>Installer Conversion Count:</th>
                <th>Installer SignUp Count:</th>
                <th>Amount Owed:</th>
                <th>Total Earned:</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Checkbox</th>
                <td>TBD</td>
                <td>TBD</td>
                <td>TBD</td>
                <td>TBD</td>
                <td>TBD</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Button variant="primary" type="submit">
          Pay Selected Referral Partners
        </Button>
      </div>
    )
  }
}
