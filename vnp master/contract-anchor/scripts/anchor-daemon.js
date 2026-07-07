const { ethers } = require("hardhat");

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const privateKey = process.env.VNP_ISSUER_PRIVATE_KEY;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const intervalMinutes = parseInt(process.env.ANCHOR_INTERVAL_MINUTES || "60", 10);

  console.log(`VNP Smart Contract Anchor daemon started.`);
  console.log(`RPC URL:          ${rpcUrl}`);
  console.log(`Contract Address: ${contractAddress || "None (Simulation Mode)"}`);
  console.log(`Interval:         ${intervalMinutes} minutes`);

  if (!privateKey || !contractAddress) {
    console.warn("WARNING: VNP_ISSUER_PRIVATE_KEY or CONTRACT_ADDRESS not set. Running in EMULATION MODE.");
    runSimulation(intervalMinutes);
    return;
  }

  // Set up provider and wallet
  let provider, wallet, contract;
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    wallet = new ethers.Wallet(privateKey, provider);
    
    const VNPAnchorABI = [
      "function anchorMeasurements(bytes32 _merkleRoot, uint256 _measurementCount, string calldata _ipfsHash) external returns (uint256)",
      "function getAnchorCount() external view returns (uint256)"
    ];
    contract = new ethers.Contract(contractAddress, VNPAnchorABI, wallet);
    console.log(`Connected to blockchain. Wallet address: ${wallet.address}`);
  } catch (err) {
    console.error(`Failed to connect to RPC or initialize wallet: ${err.message}. Falling back to EMULATION MODE.`);
    runSimulation(intervalMinutes);
    return;
  }

  // Periodic loop
  while (true) {
    try {
      console.log(`[${new Date().toISOString()}] Initiating hourly anchor...`);
      
      // Generate a mock Merkle Root and parameters for anchoring
      const randomBytes = ethers.randomBytes(32);
      const mockMerkleRoot = ethers.hexlify(randomBytes);
      const mockCount = Math.floor(Math.random() * 5000) + 1000;
      const mockIpfsHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      console.log(`Anchoring Merkle Root: ${mockMerkleRoot}`);
      console.log(`Measurement Count:     ${mockCount}`);
      console.log(`IPFS Hash:             ${mockIpfsHash}`);

      // Call contract
      const tx = await contract.anchorMeasurements(mockMerkleRoot, mockCount, mockIpfsHash);
      console.log(`Transaction submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}`);
    } catch (err) {
      console.error(`Error during anchoring execution: ${err.message}`);
    }

    console.log(`Sleeping for ${intervalMinutes} minutes...`);
    await sleep(intervalMinutes * 60 * 1000);
  }
}

function runSimulation(intervalMinutes) {
  setInterval(() => {
    const mockRoot = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const mockCount = Math.floor(Math.random() * 4000) + 1000;
    const mockIpfs = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    console.log(`[${new Date().toISOString()}] [EMULATION] Merkle root anchored successfully:`);
    console.log(`  Merkle Root: ${mockRoot}`);
    console.log(`  Count:       ${mockCount}`);
    console.log(`  IPFS Hash:   ${mockIpfs}`);
    console.log(`  Tx Hash:     0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`);
  }, intervalMinutes * 60 * 1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("Daemon crashed:", error);
  process.exit(1);
});
