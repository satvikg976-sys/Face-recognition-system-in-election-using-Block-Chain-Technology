require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    mstTestnet: {
      url: "https://testnetrpc.mstblockchain.com",
      chainId: 91562037,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" ? [PRIVATE_KEY] : [],
    },
    mstMainnet: {
      url: "https://mariorpc.mstblockchain.com/",
      chainId: 4646,
      accounts: PRIVATE_KEY !== "0x0000000000000000000000000000000000000000000000000000000000000001" ? [PRIVATE_KEY] : [],
    },
  },
};
