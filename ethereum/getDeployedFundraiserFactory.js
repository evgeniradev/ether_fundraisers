import web3 from './web3';
import FundraiserFactory from './build/FundraiserFactory.json';

const instance = (address) => {
  return new web3.eth.Contract(FundraiserFactory.abi, address);
};

export default instance;
