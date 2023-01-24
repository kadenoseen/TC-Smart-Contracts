// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {

  const NFT = await hre.ethers.getContractFactory("ThugCityNFT");
  const nft = await NFT.deploy();
  await nft.deployed();
  console.log(`NFT contract deployed at ${nft.address}`);
  
  const BILLS = await hre.ethers.getContractFactory("Bills");
  const bills = await BILLS.deploy();
  await bills.deployed()

  console.log(`BILLS contract deployed at ${bills.address}`);

  const ASSETS = await hre.ethers.getContractFactory("Assets");
  const assets = await ASSETS.deploy();
  await assets.deployed()

  console.log(`Assets contract deployed at ${assets.address}`);

  const CITY = await hre.ethers.getContractFactory("City");
  const city = await CITY.deploy(nft.address, bills.address, assets.address);
  await city.deployed()

  console.log(`City contract deployed at ${city.address}`);

  const setNFT = await nft.addManager(city.address);
  await setNFT.wait();
  console.log(`NFT contract added ${city.address} as manager`);

  const setBILLS = await bills.addManager(city.address);
  await setBILLS.wait();
  console.log(`BILLS contract added ${city.address} as manager`);

  const setAssets = await assets.setThugCity(city.address);
  await setAssets.wait();
  console.log(`Assets contract set ${city.address} as ThugCity`);
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
