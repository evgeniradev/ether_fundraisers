const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const compiledFundraiserFactory =
  require('../ethereum/build/FundraiserFactory.json');
const compiledFundraiser =
  require('../ethereum/build/Fundraiser.json');

const gas = '1400000';
const gasPrice = '50000000000';
let web3;
let accounts;
let creator;
let recipient;
let contributor;
let anotherContributor;
let factory;
let fundraiser;
let targetValue;
let minimumContribution;
const description = 'This is the description';

beforeEach(async () => {
  web3 = new Web3(ganache.provider({ gasLimit: gas }));
  accounts = await web3.eth.getAccounts();
  creator = accounts[0];
  recipient = accounts[1];
  contributor = accounts[2];
  anotherContributor = accounts[3];
  targetValue = web3.utils.toWei('5', 'ether');
  minimumContribution = web3.utils.toWei('1', 'ether');

  factory =
    await new web3.eth.Contract(compiledFundraiserFactory.abi)
      .deploy({ data: compiledFundraiserFactory.bytecode })
      .send({ from: creator, gas: gas, gasPrice: gasPrice });

  await factory
    .methods
    .create(recipient, targetValue, minimumContribution, description)
    .send({ from: creator, gas: gas, gasPrice: gasPrice });

  [fundraiserAddress] = await factory.methods.getDeployedFundraisers().call();

  fundraiser =
    await new web3.eth.Contract(compiledFundraiser.abi, fundraiserAddress);
});

describe('Campaigns', () => {
  it('creates a factory', () => {
    assert.ok(factory.options.address);
  });

  it('creates a fundraiser', () => {
    assert.ok(fundraiser.options.address);
  });

  it('fails to create fundraiser with description > 256 chars', async () => {
    try {
      await factory
        .methods
        .create(
          recipient,
          targetValue,
          minimumContribution,
          'x'.repeat(257)
        )
        .send({ from: creator, gas: gas, gasPrice: gasPrice });
      assert(false);
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });

  it('assigns a description to fundraiser', async () => {
    const fundraiserDescription = await fundraiser.methods.description().call();
    assert.equal(fundraiserDescription, description);
  });

  it('gets summary', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('3', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    const summary = await fundraiser.methods.getSummary().call();
    const balance = web3.utils.toWei('3', 'ether');
    const totalContributors = '1';
    const targetValue = web3.utils.toWei('5', 'ether');
    const minimumContribution = web3.utils.toWei('1', 'ether');
    const finalized = false;

    const expectation =
      {
        0: fundraiser.options.address,
        1: creator,
        2: recipient,
        3: description,
        4: balance,
        5: totalContributors,
        6: targetValue,
        7: minimumContribution,
        8: finalized
      };

    assert.deepEqual(summary, expectation);
  });

  it('contributes', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('1', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    const balance = await web3.eth.getBalance(fundraiser.options.address);

    assert.equal(balance, web3.utils.toWei('1', 'ether'));
  });

  it('contribution fails if fundraiser is finalized', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('10', 'ether'),
      from: anotherContributor,
      gas: gas,
      gasPrice: gasPrice
    });

    try {
      await fundraiser.methods.contribute().send({
        value: web3.utils.toWei('10', 'ether'),
        from: contributor,
        gas: gas,
        gasPrice: gasPrice
      });
      assert(false);
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });

  it('fails to finalize if fundraiser is already finalized', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('10', 'ether'),
      from: anotherContributor,
      gas: gas,
      gasPrice: gasPrice
    });

    try {
      await fundraiser.methods.finalize().call();
      assert(false);
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });

  it('receives refund', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    await fundraiser.methods.refund().send({
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    const balance = await web3.eth.getBalance(contributor);

    assert(balance > web3.utils.toWei('99.9', 'ether'));
  });

  it('fails when attemps to receive refund twice', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: anotherContributor,
      gas: gas,
      gasPrice: gasPrice
    });

    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    await fundraiser.methods.refund().send({
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    try {
      await fundraiser.methods.refund().send({
        from: contributor,
        gas: gas,
        gasPrice: gasPrice
      });
      assert(false)
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });

  it('refund fails if contributor never contributed', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    try {
      await fundraiser.methods.refund().send({
        from: anotherContributor,
        gas: gas,
        gasPrice: gasPrice
      });
      assert(false)
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });

  it('pays recipient', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('10', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    const balance = await await web3.eth.getBalance(recipient);

    assert.equal(balance, web3.utils.toWei('105', 'ether'));
  });

  it('returns reminder to last contributor', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('2', 'ether'),
      from: anotherContributor,
      gas: gas,
      gasPrice: gasPrice
    });

    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('10', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    const balance = await web3.eth.getBalance(contributor);
    const expectation =
      balance > web3.utils.toWei('96.9', 'ether') &&
      balance < web3.utils.toWei('97', 'ether')

    assert(expectation);
  });

  it('attempting to finalize fails if targetValue not reached', async () => {
    await fundraiser.methods.contribute().send({
      value: web3.utils.toWei('3', 'ether'),
      from: contributor,
      gas: gas,
      gasPrice: gasPrice
    });

    try {
      await fundraiser.methods.finalize().send({
        from: contributor,
        gas: gas,
        gasPrice: gasPrice
      });
      assert(false)
    } catch (e) {
      assert(e.name !== 'AssertionError');
    }
  });
});
