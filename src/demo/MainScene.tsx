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
  apiKeys: []
  startDate: string
  endDate: string
  masterKey: string
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
      apiKeys: [],
      startDate: '',
      endDate: '',
      masterKey: CONFIG.masterKey
    }
  }

  getSummary = (startDate: string, endDate: string): any => {
    fetch(
      'https://util1.edge.app/api/v1/partner/list?masterKey=' +
        this.state.masterKey
    )
      .then(response => {
        if (response.ok) {
          return response.json()
        }
      })
      .then(KeysArray => {
        this.setState({ apiKeys: KeysArray })
      })
      .catch(e => {
        console.log(e)
      })
    console.log('GetTransactions is called', this.state.keys)
  }

  // fetchSummary = (): any => {
  //   .then(async apiKeys => {
  //     await Promise.all(
  //       apiKeys.map((value, index, array) => {
  //         fetch(
  //           'https://dl.edge.app/api/v1/partner/revenue?apiKey=' +
  //             value.apiKey +
  //             '&startDate=' +
  //             startDate +
  //             '&endDate=' +
  //             endDate,
  //           { method: 'GET' }
  //         )
  //           .then(response => {
  //             if (response.ok) {
  //               return response.json()
  //             }
  //           })
  //           .then(apiKeys => {
  //             array[index] = { ...e, ...data }
  //           })
  //           .then(KeysArray => {
  //             this.setState({ keys: KeysArray })
  //           })
  //       })
  //     )
  //   })
  // }

  handleSummaryClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    this.getSummary(this.state.startDate, this.state.endDate)
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
    const { startDate, endDate, apiKeys } = this.state
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
          <div>{JSON.stringify(apiKeys)}</div>
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
