// deploy code will go here

const HDWalletProvider = require('truffle-hdwallet-provider');
const Web3 = require('web3');
const factory = require('./build/FundraiserFactory.json');

const provider = new HDWalletProvider(
  process.env.MNEMONIC_PHRASE,
  process.env.INFURA_URL
);

const web3 = new Web3(provider);

(async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Attempting to deploy from account', accounts[0]);

  const result = await new web3.eth.Contract(factory.abi)
    .deploy({ data: factory.bytecode, arguments: [22] })
    .send({ gas: '1400000', gasPrice: '5000000000', from: accounts[0], });

  console.log('Contract deployed to', result.options.address);
})()
  .catch(e => {
      console.error(e);
  })
  .finally(() => process.exit());;
