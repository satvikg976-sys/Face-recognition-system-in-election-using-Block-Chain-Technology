const { ethers } = require("ethers");
require("dotenv").config();

async function check() {
  const provider = new ethers.JsonRpcProvider("https://testnetrpc.mstblockchain.com");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log("Checking MST Testnet Balance for:", wallet.address);
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "tMSTC");
    return balance;
  } catch (err) {
    console.error("RPC Error:", err.message);
  }
}

check();
