require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
    },
    goerli: {
      url: process.env.ALCHEMY_URL,
      // 1 = Owner, 2 = User1, 3 = User2
      accounts: [process.env.OWNER_KEY, process.env.USER1_KEY, process.env.USER2_KEY]
    }
  },
};
