// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract CoveredCallContract {

    address public callWriter;
    address public callBuyer;
    uint public amount;
    uint public optionPrice;
    uint public strikePrice;
    uint public expiryDate;
    bool wasPurchased;
    bool optionExecuted;

    constructor(uint _amount, uint _optionPrice, uint _strikePrice) {
        callWriter = msg.sender;
        amount = _amount;
        optionPrice = _optionPrice;
        strikePrice = _strikePrice;
        expiryDate = block.timestamp + 1 weeks;
    }

    function setWasPurchased(bool _wasPurchased) public {
        wasPurchased = _wasPurchased;
    }

    function setOptionExecuted(bool _optionExecuted) public {
        optionExecuted = _optionExecuted;
    }

    // this function is how the callwriter deposits the collateral to cover the option
    function depositCollateral() public payable {
        require(msg.value >= amount, " Insufficient balance");
    }

    // this function allows the buyer to purchase the contract and pay the premium
    function purchaseOption() external payable {
        // ensure buyer hasn't already bought the option
        require(wasPurchased == false);
        // ensure buyer sends the correct amount
        require(msg.value == optionPrice, "Incorrect purchase price");
        // set the option buyer to the callbuyer
        callBuyer = msg.sender;
        // if the buyer buys the option, the price is transfered directly to the writer
        payable(callWriter).transfer(msg.value);
        // set the wasPurchased to true one the option has been purchased
        wasPurchased = true;

    }

    // the option will be executed if the price of ETH is above the strike price 
    function executeOption(address _callBuyer) external payable {
        // ensure the buyer has purchased the option
        require(wasPurchased == true, "Option has not been purchased");
        // ensure the option has not already been executed
        require(optionExecuted == false, "you cannot execute an option twice");
        // ensure the contract has been funded by the call writer
        require(address(this).balance == amount, "Funding error");
        // make sure the contract has not expired
        require(block.timestamp <= expiryDate, "Option has already expired");
        // ensure the amount the buyer pays at execution is equal to the strikeprice
        require(msg.value == strikePrice, "Payment error");
        payable(callWriter).transfer(msg.value);
        // if all the above hold transfer the amount to the buyer
        payable(_callBuyer).transfer(amount);
        // set option execution to ture now that the option has been executed
        optionExecuted = true;
    }

    // if the option is not executed the initial funds will be sent back to the call writer
    function refund() public payable {
        // validate the caller of the refund is only the call writer
        require(block.timestamp >= expiryDate, "Option has not expired yet");
        require(wasPurchased == false, "Option has already been purchased");    
        payable(callWriter).transfer((address(this).balance));
    }

    receive() 
        external 
        payable {

    }
}








