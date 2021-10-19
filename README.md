# EtherFundraisers

An Ethereum/Solidity & Next.js-based fundraiser app.

## Requirements

You will need [MetaMask](https://metamask.io) to interact with the smart contracts.

## Installation

Please, use [Docker](https://docs.docker.com) to install the app.

Please, set the following ENV variables in docker-compose.yml:

* FACTORY_ADDRESS is the address of a deployed FundraiserFactory which you can deploy using the deploy.js script.
* INFURA_URL is the Ethereum provider URL which you can obtain from https://infura.io.
* MNEMONIC_PHRASE is the mnemonic phrase of your Ethereum wallet.

Run the below command to build the container.
```
$ docker-compose build
```

Start the app in production mode using the below command.
```
$ docker-compose up
```

Finally, load [http://localhost](http://localhost) in your browser.

## Running the tests

```
$ docker-compose run --rm ether_fundraisers yarn test
```
