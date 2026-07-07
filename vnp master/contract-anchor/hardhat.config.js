require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

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
    hardhat: {
      chainId: 1337,
    },
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.VNP_ISSUER_PRIVATE_KEY ? [process.env.VNP_ISSUER_PRIVATE_KEY] : [],
      chainId: 84532,
    },
    base: {
      url: "https://mainnet.base.org",
      accounts: process.env.VNP_ISSUER_PRIVATE_KEY ? [process.env.VNP_ISSUER_PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
