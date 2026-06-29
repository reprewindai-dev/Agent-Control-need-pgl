/**
 * Hardhat Configuration for VNP Anchor Contract
 * 
 * Deployment targets:
 * - Base Sepolia (testnet): npx hardhat run scripts/deploy-vnp-anchor.js --network baseSepolia
 * - Base Mainnet: npx hardhat run scripts/deploy-vnp-anchor.js --network base
 * 
 * Verification:
 * - npx hardhat verify --network base 0x... (after deployment)
 */

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
    // Local Hardhat network (for testing)
    hardhat: {
      chainId: 1337,
      forking: {
        enabled: process.env.FORKING === "true",
        url: `https://mainnet.base.org`,
      },
    },

    // Base Sepolia Testnet
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.VNP_ISSUER_PRIVATE_KEY
        ? [process.env.VNP_ISSUER_PRIVATE_KEY]
        : [],
      chainId: 84532,
      gasPrice: 1000000000, // 1 gwei (typical for Sepolia)
      verify: {
        etherscan: {
          apiUrl: "https://sepolia.basescan.org/api",
          apiKey: process.env.BASESCAN_API_KEY || "verifyContract",
        },
      },
    },

    // Base Mainnet
    base: {
      url: "https://mainnet.base.org",
      accounts: process.env.VNP_ISSUER_PRIVATE_KEY
        ? [process.env.VNP_ISSUER_PRIVATE_KEY]
        : [],
      chainId: 8453,
      gasPrice: "auto", // Determine from network
      verify: {
        etherscan: {
          apiUrl: "https://api.basescan.org",
          apiKey: process.env.BASESCAN_API_KEY || "verifyContract",
        },
      },
    },

    // Ethereum Mainnet (for reference, not used)
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.VNP_ISSUER_PRIVATE_KEY ? [process.env.VNP_ISSUER_PRIVATE_KEY] : [],
      chainId: 1,
    },
  },

  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "verifyContract",
      baseSepolia: process.env.BASESCAN_API_KEY || "verifyContract",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 200000, // 200 seconds for long-running tests
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
};
