const path = require('path');
const solc = require('solc');
const fs = require('fs-extra');

const contractFilename = 'Fundraiser.sol';

const buildPath = path.resolve(__dirname, 'build');
fs.removeSync(buildPath);

const campaignPath = path.resolve(__dirname, 'contracts', contractFilename);
const source = fs.readFileSync(campaignPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {},
  settings: {
    outputSelection: {
      '*': {
        '*': ['*']
      }
    }
  }
};

input['sources'][contractFilename] = { content: source };

console.log('Compiling Smart Contract...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));
console.log('Compilation Output:');
console.log(output);
const contract = output.contracts[contractFilename];

fs.ensureDirSync(buildPath);

for (const contractName in contract) {
  fs.outputJsonSync(
    path.resolve(buildPath, contractName + '.json'),
    {
      abi: contract[contractName].abi,
      bytecode: contract[contractName].evm.bytecode.object
    }
  );
}
