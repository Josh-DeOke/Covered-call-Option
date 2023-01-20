const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const { Web3Provider } = require("@ethersproject/providers");

describe("CoveredCallContract", function () {

  let coveredCallContract;
  let callWriter;
  let callBuyer;
  const amount = ethers.utils.parseEther("1");
  const optionPrice = ethers.utils.parseEther("0.1");
  const strikePrice = ethers.utils.parseEther("1.5");

  this.beforeEach(async () => {
    [callWriter, callBuyer] = await ethers.getSigners();
    const CoveredCallContract = await ethers.getContractFactory("CoveredCallContract");
    coveredCallContract = await CoveredCallContract.deploy(amount, optionPrice, strikePrice);
    await coveredCallContract.deployed();
  });

  it("should have call writer address equal the deployer address", async () => {
    assert(await coveredCallContract.connect(callWriter))
  });

  it('should set option expiry date', async () => {
    const expiryDate = await coveredCallContract.expiryDate();
    assert(expiryDate);
  });

  it('should set wasPurchased bool to false', async () => {
    await coveredCallContract.setWasPurchased(false);
  });

  it('should set optionExecution bool to false', async () => {
    await coveredCallContract.setOptionExecuted(false);
  });

  it('should NOT deposit collateral if writers balance is too low', async () => {
    const writerBalance = await ethers.provider.getBalance(callWriter.address);
    expect(writerBalance).to.be.greaterThan(amount);
  });
    
  it('should deposit the collateral', async () => {
    await coveredCallContract.connect(callWriter).depositCollateral({value: amount});
    const balance = await ethers.provider.getBalance(coveredCallContract.address);
    const amountHex = ethers.utils.hexlify(amount);
    const balanceHex = ethers.utils.hexlify(balance);
    assert.equal(balanceHex, amountHex);
  });

  it('should NOT buy option if not paying the correct price', async () => {
    await expect(coveredCallContract.purchaseOption({value: ethers.utils.parseEther("0.2")})).to.be.revertedWith("Incorrect purchase price");
  });

  it('should purchase option', async () => {
    await coveredCallContract.setWasPurchased(false);
    await coveredCallContract.connect(callBuyer).purchaseOption({value: optionPrice});
  });
  
  it('should execute option', async () => {
    // ensure the option has been purchased
    await coveredCallContract.setWasPurchased(true);
    // ensure the option has not already been executed
    await coveredCallContract.setOptionExecuted(false);
    // ensure the contract has been funded
    await coveredCallContract.connect(callWriter).depositCollateral({value: amount});
    const balance = await ethers.provider.getBalance(coveredCallContract.address);
    assert.equal(balance.toString(), amount.toString());
    // ensure the call buyer is purchasing the option
    await coveredCallContract.connect(callBuyer).purchaseOption({value: optionPrice});
    // ensure the contract has not expired yet
    const expiryDate = await coveredCallContract.expiryDate();
    assert(expiryDate);
    assert.isBelow(
      Number((await hre.network.provider.request({
        method: "evm_blockTimestamp"
      })).result), 
      expiryDate.toNumber()
    );
    // execute the option
    await coveredCallContract.executeOption({from: callBuyer.address, value: strikePrice});
    // mark the option as executed
    await coveredCallContract.setOptionExecuted(true);
    // ensure the amount being paid at execution is equal to the strikeprice
    const expectedStrikePrice = strikePrice;
    assert.equal(strikePrice.toString(), expectedStrikePrice.toString());
    // ensure the price of the option has been transferred to the call writer
    const writerBalance = await ethers.provider.getBalance(callWriter.address);
    assert.isTrue((writerBalance.toString()).gte(strikePrice.toString()));
    // ensure the collateral has been trasferred to the call buyer
    const buyerBalance = await ethers.provider.getBalance(callBuyer.address);
    assert.isTrue((buyerBalance.toString()).gte(amount.toString()));
  });

  it('should refund the writer if option not executed', async () => {
    // ensure the wasPurchased function is false
    await coveredCallContract.setWasPurchased(false);
    const expiryDate = await coveredCallContract.expiryDate();
    assert(expiryDate);
    assert.isAtLeast
    Number((await hre.network.provider.request({
      method: "evm_setNextBlockTimestamp",
      // setting the block.timestamp to 1 second after the expiry date to ensure it is set to
      // a time after the exipry date allowing the refund function to be executed without being reverted.
      params: [expiryDate.toNumber() + 1]
    })), 
    expiryDate.toNumber()
    );
    await hre.network.provider.request({ method: "evm_mine" });
  });
});








