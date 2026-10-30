const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env");

function setupWallet() {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/PRIVATE_KEY=(0x[a-fA-F0-9]{64}|[a-fA-F0-9]{64})/);
    if (match) {
      const key = match[1].startsWith("0x") ? match[1] : "0x" + match[1];
      const wallet = new ethers.Wallet(key);
      console.log("==================================================");
      console.log("🔑 Existing Deployer Wallet Detected!");
      console.log("Address: ", wallet.address);
      console.log("==================================================");
      return;
    }
  }

  // Generate fresh wallet
  const wallet = ethers.Wallet.createRandom();
  const envContent = `# Auto-generated Deployer Wallet for MST Testnet
PRIVATE_KEY=${wallet.privateKey}
`;
  fs.writeFileSync(envPath, envContent);

  console.log("==================================================");
  console.log("✨ Generated New Deployer Wallet!");
  console.log("Address: ", wallet.address);
  console.log("Private Key saved to contracts/.env");
  console.log("==================================================");
  console.log("👉 Go to: https://coral-faucet.mstblockchain.com/");
  console.log("👉 Or:    https://faucet.masterstroke.academy");
  console.log(`👉 Paste your address: ${wallet.address}`);
  console.log("👉 Claim free tMSTC, then run deployment!");
  console.log("==================================================");
}

setupWallet();
