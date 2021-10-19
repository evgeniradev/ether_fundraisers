// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract FundraiserFactory {
    address[] public deployedFundraisers;

    function create(
      address payable _recipient,
      uint _targetValue,
      uint _minimumContribution,
      string calldata _description
    ) public {

        address fundraiser =
          address(
            new Fundraiser(
              msg.sender,
              _recipient,
              _targetValue,
              _minimumContribution,
              _description
            )
          );

        deployedFundraisers.push(fundraiser);
    }

    function getDeployedFundraisers() external view returns (address[] memory) {
        return deployedFundraisers;
    }
}

contract Fundraiser {
    address public creator;
    address payable public recipient;
    uint public targetValue;
    uint public minimumContribution;
    uint public totalContributors;
    string public description;
    bool public finalized = false;
    mapping(address => uint) public contributors;

    modifier ensureNotFinalized() {
        require(!finalized);
        _;
    }

    constructor(
      address _creator,
      address payable _recipient,
      uint _targetValue,
      uint _minimumContribution,
      string memory _description
    ) {
        require(bytes(_description).length <= 256);

        creator = _creator;
        recipient =_recipient;
        targetValue = _targetValue;
        minimumContribution = _minimumContribution;
        description = _description;
    }

    function contribute() external payable ensureNotFinalized {
        require(msg.value >= minimumContribution);

        contributors[msg.sender] = contributors[msg.sender] + msg.value;
        totalContributors++;

        if (isTargetValueReached()) {
            finalize();
        }
    }

    function refund() external payable ensureNotFinalized {
      uint amount = contributors[msg.sender];

      require(amount > 0);

      totalContributors = totalContributors - 1;
      contributors[msg.sender] = 0;

      payable(msg.sender).transfer(amount);
    }

    function finalize() public payable ensureNotFinalized {
        require(isTargetValueReached());

        // pay recipient
        recipient.transfer(targetValue);

        // transfer reminder to last contributor
        if (getBalance() > 0) {
            payable(payable(msg.sender)).transfer(getBalance());
        }

        finalized = true;
    }

    function getSummary() public view returns (
      address, address, address, string memory, uint, uint, uint, uint, bool
    ) {
      return (
        address(this),
        creator,
        recipient,
        description,
        getBalance(),
        totalContributors,
        targetValue,
        minimumContribution,
        finalized
      );
    }

    function getBalance() private view returns (uint) {
        return address(this).balance;
    }

    function isTargetValueReached() private view returns (bool) {
        return getBalance() >= targetValue;
    }
}
