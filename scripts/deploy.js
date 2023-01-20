const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const { any } = require("hardhat/internal/core/params/argumentTypes");
const { ethers } = require("hardhat");

async function main() {

  const amount = ethers.utils.parseEther('1.0');
  const optionPrice = ethers.utils.parseEther('0.1');
  const strikePrice = ethers.utils.parseEther("1.5");

  const CoveredCallContract = await hre.ethers.getContractFactory("CoveredCallContract");
  const coveredCallContract = await CoveredCallContract.deploy(amount, optionPrice, strikePrice);

  await coveredCallContract.deployed();

  console.log("CoveredCallContract deployed to:", coveredCallContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
