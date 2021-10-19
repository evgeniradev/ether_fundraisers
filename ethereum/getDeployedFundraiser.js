import web3 from './web3';
import Fundraiser from './build/Fundraiser.json';

const instance = (address) => {
  return new web3.eth.Contract(Fundraiser.abi, address);
};
export default instance;
