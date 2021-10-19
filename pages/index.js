import React, { Component } from 'react';
import { Message, Form, Input, Button, Table, Icon, Container, Popup } from 'semantic-ui-react';
import getDeployedFundraiserFactory from '../ethereum/getDeployedFundraiserFactory';
import getDeployedFundraiser from '../ethereum/getDeployedFundraiser';
import web3 from '../ethereum/web3';

import 'semantic-ui-css/semantic.min.css';

class FundraiserIndex extends Component {
  static fundraiserFactoryAddress = process.env.FACTORY_ADDRESS;

  state = {
    account: null,
    recipientAddress: '',
    description: '',
    minimumContribution: '',
    targetValue: '',
    loading: false,
    errorMessage: ''
  };

  static async getInitialProps() {
    const deployedFundraiserFactory =
      getDeployedFundraiserFactory(this.fundraiserFactoryAddress);

    const fundraiserAddresses =
      await deployedFundraiserFactory.methods.getDeployedFundraisers().call();

    const fundraisers =
      await Promise.all(
        fundraiserAddresses
          .map(
            async (a) => {
              const tmp =
                await getDeployedFundraiser(a).methods.getSummary().call();

              const address = tmp[0];
              const creatorAddress = tmp[1];
              const recipientAddress = tmp[2];
              const description = tmp[3];
              const balance = web3.utils.fromWei(tmp[4], 'ether');
              const totalContributors = tmp[5];
              const targetValue = web3.utils.fromWei(tmp[6], 'ether');
              const minimumContribution = web3.utils.fromWei(tmp[7], 'ether');
              const finalized = tmp[8];

              return {
                address,
                creatorAddress,
                recipientAddress,
                description,
                balance,
                totalContributors,
                targetValue,
                minimumContribution,
                finalized
              };
            }
          )
      ).then((v) => v)

    return { fundraisers };
  }

  componentDidMount = async () => {
    const accounts = await web3.eth.getAccounts();
    this.setState({ account: accounts[0] });
  }

  toggleBtn = (btn) => {
    if (btn.disabled) {
      btn.classList.remove('loading');
      btn.disabled = false;
    } else {
      btn.classList.add('loading');
      btn.disabled = true;
    }
  }

  create = async (e) => {
    e.preventDefault();
    this.setState({ loading: true, errorMessage: '' });

    const { recipientAddress, description, minimumContribution, targetValue } =
      this.state;

    if (description.length > 256) {
      this.setState({
        errorMessage: 'Description cannot be longer than 256 characters.',
        loading: false
      });
      return;
    }

    const deployedFundraiserFactory =
      getDeployedFundraiserFactory(this.constructor.fundraiserFactoryAddress);

    try {
      await deployedFundraiserFactory
        .methods
        .create(
          recipientAddress,
          web3.utils.toWei(targetValue, 'ether') ,
          web3.utils.toWei(minimumContribution, 'ether'),
          description
        )
        .send({ from: this.state.account });
      location.reload();
    } catch (e) {
      this.setState({ errorMessage: e.message });
    }
    this.setState({ loading: false });
  }

  contribute = async (e) => {
    e.preventDefault();

    const button = e.target.children[1];
    this.toggleBtn(button);

    const deployedFundraiser = getDeployedFundraiser(e.target.address.value);
    const newContribution = e.target.amount.value;

    try {
      const minimumContribution =
        await deployedFundraiser
          .methods
          .minimumContribution()
          .call();

      if (newContribution < web3.utils.fromWei(minimumContribution, 'ether'))
        throw { message: "Your contribution is below the fundraiser's minimum." }

      await deployedFundraiser.methods
        .contribute()
        .send({
          from: this.state.account,
          value: web3.utils.toWei(newContribution, 'ether')
        });
      location.reload();
    } catch (e) {
      alert(`Error: ${e.message}`)
    }

    this.toggleBtn(button);
  }

  refund = async (e) => {
    e.preventDefault();

    const button = e.target.children[0];
    this.toggleBtn(button);

    const deployedFundraiser = getDeployedFundraiser(e.target.address.value);

    try {
      const contribution =
        await deployedFundraiser
          .methods
          .contributors(this.state.account)
          .call();

      if (contribution == 0)
        throw { message: 'You have no contributions in this fundraiser.' }

      await deployedFundraiser
        .methods
        .refund()
        .send({ from: this.state.account });
      location.reload();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }

    this.toggleBtn(button);
  }

  createPopup(text) {
    return <Popup content={text} trigger={<p>{`${text.substring(0,10)}...`}</p>}/>;
  }

  renderFundraisers() {
    return this.props.fundraisers.map((f, index) => {
      return <Table.Row key={index} disabled={f.finalized}>
        <Table.Cell>{this.createPopup(f.address)}</Table.Cell>
        <Table.Cell>{this.createPopup(f.creatorAddress)}</Table.Cell>
        <Table.Cell>{this.createPopup(f.recipientAddress)}</Table.Cell>
        <Table.Cell>{this.createPopup(f.description)}</Table.Cell>
        <Table.Cell>
          {!f.finalized && <Form onSubmit={this.contribute}>
            <Input defaultValue='0' name='amount' type='number' step='any'/>
            <Button style={{ marginTop: '.5rem' }} color='green' value={f.address} name='address' fluid content={'Contribute'}/>
          </Form>}
        </Table.Cell>
        <Table.Cell>
          {!f.finalized && <Form onSubmit={this.refund}>
            <Button value={f.address} color='yellow' name='address' fluid content={'Refund'}/>
          </Form>}
        </Table.Cell>
        <Table.Cell>{f.balance}</Table.Cell>
        <Table.Cell>{f.totalContributors}</Table.Cell>
        <Table.Cell>{f.targetValue}</Table.Cell>
        <Table.Cell>{f.minimumContribution}</Table.Cell>
        <Table.Cell>{f.finalized.toString()}</Table.Cell>
      </Table.Row>
    });
  }
  render() {
    return (
      <Container fluid style={{ padding: '1rem 2rem' }}>
        <h1>Create a Fundraiser</h1>
        <Form onSubmit={this.create} error={!!this.state.errorMessage}>
          <Form.Field>
            <label>Description</label>
            <Input
              value={this.state.description}
              onChange={(event) =>
                this.setState({ description: event.target.value })
              }
            />
          </Form.Field>
          <Form.Field>
            <label>Recipient Address</label>
            <Input
              value={this.state.recipientAddress}
              onChange={(event) =>this.setState({ recipientAddress: event.target.value })}
            />
          </Form.Field>
          <Form.Field>
            <label>Minimum Contribution Value(ether)</label>
            <Input
              value={this.state.minimumContribution}
              onChange={(event) => this.setState({ minimumContribution: event.target.value })
              }
            />
          </Form.Field>
          <Form.Field>
            <label>Target Value(ether)</label>
            <Input
              value={this.state.targetValue}
              onChange={(event) => this.setState({ targetValue: event.target.value })}
            />
          </Form.Field>
          <Message error header='Error' content={this.state.errorMessage}/>
          <Button content={'Create'} primary loading={this.state.loading} disabled={this.state.loading}/>
        </Form>
        <h1>Fundraisers</h1>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(34,36,38,.15)', borderRadius: '.28571429rem' }}>
          <Table unstackable  style={{ border: 'none' }}>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Address</Table.HeaderCell>
                  <Table.HeaderCell>Creator Address</Table.HeaderCell>
                  <Table.HeaderCell>Recipient Address</Table.HeaderCell>
                  <Table.HeaderCell>Description</Table.HeaderCell>
                  <Table.HeaderCell>Contribute(ether)</Table.HeaderCell>
                  <Table.HeaderCell>Refund</Table.HeaderCell>
                  <Table.HeaderCell>Balance(ether)</Table.HeaderCell>
                  <Table.HeaderCell>Total Contributors</Table.HeaderCell>
                  <Table.HeaderCell>Target Value(ether)</Table.HeaderCell>
                  <Table.HeaderCell>Minimum Contribution(ether)</Table.HeaderCell>
                  <Table.HeaderCell>Finalized?</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {this.renderFundraisers()}
              </Table.Body>
            </Table>
          </div>
      </Container>
    );
  }
}

export default FundraiserIndex;
