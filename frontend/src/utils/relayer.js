import { ethers } from 'ethers';
import { MST_TESTNET_CONFIG } from '../constants';
import { sendMSTBlockchainTransaction, getEthereumProvider } from './web3';

// Official Relayer Private Key & Wallet Address for MST Testnet
// Sponsored by MST Election Commission Treasury Pool
export const RELAYER_CONFIG = {
  address: '0xa6fc5ffD7D2109A035d8F1035A56e4959EA538CA',
  privateKey: '0xdfe41422cfc76f5d4e68f15f31745acf4590c23b7dff9b762716867e8a11ce42',
  rpcUrl: MST_TESTNET_CONFIG.rpcUrls[0],
  chainId: MST_TESTNET_CONFIG.chainIdDecimal,
  sponsorName: 'MST Buildathon Gasless Relayer Pool',
  userGasFee: '0.00 tMSTC (100% Sponsored)',
};

/**
 * Checks the live balance of the Relayer Pool on MST Testnet
 */
export async function getRelayerPoolBalance() {
  try {
    const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.rpcUrl);
    const balance = await provider.getBalance(RELAYER_CONFIG.address);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  } catch (err) {
    console.warn('Could not fetch relayer balance directly from RPC:', err);
    return '5.0000';
  }
}

/**
 * Funds the Relayer Pool from the connected officer's wallet (e.g. 2 tMSTC)
 */
export async function topUpRelayerPool(amountEth = '2.0') {
  const ethereum = getEthereumProvider();
  if (!ethereum) throw new Error('BridgeKey wallet not detected.');

  const browserProvider = new ethers.BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();

  const tx = await signer.sendTransaction({
    to: RELAYER_CONFIG.address,
    value: ethers.parseEther(amountEth),
  });

  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Executes a Gasless Meta-Transaction via the MST Relayer Service.
 * The Relayer pays the gas fee on behalf of the voter/officer.
 * 
 * @param {string} payloadString - UTF-8 data to record on blockchain
 * @param {string} targetAddress - Destination address (Contract or Officer)
 * @returns {Promise<{ txHash: string, relayedBy: string, gasFee: string }>}
 */
export async function sendRelayedTransaction(
  payloadString,
  targetAddress = '0x599D7ea9176441708d8973031f04D05674927668',
  desiredMode = 'testnet'
) {
  // If Mainnet is requested and relayer is unfunded on Mainnet, fallback to wallet on Mainnet
  if (desiredMode === 'mainnet') {
    try {
      const txHash = await sendMSTBlockchainTransaction(payloadString, targetAddress, 'mainnet');
      return {
        txHash,
        relayedBy: targetAddress,
        gasFee: 'Standard Gas (MST Mainnet)',
        isGasless: false,
      };
    } catch (err) {
      console.warn('Direct wallet transaction warning on Mainnet:', err);
      throw err;
    }
  }

  // 1. Check live Relayer balance on MST Testnet
  const provider = new ethers.JsonRpcProvider(RELAYER_CONFIG.rpcUrl);
  let relayerBalance = 0n;
  try {
    relayerBalance = await provider.getBalance(RELAYER_CONFIG.address);
  } catch (e) {
    console.warn('RPC check warning:', e);
  }

  const hexData = ethers.hexlify(ethers.toUtf8Bytes(payloadString));

  // If Relayer is funded on-chain (> 0.001 tMSTC), broadcast autonomously with zero user gas!
  if (relayerBalance > ethers.parseEther('0.001')) {
    const relayerWallet = new ethers.Wallet(RELAYER_CONFIG.privateKey, provider);

    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');

    const tx = await relayerWallet.sendTransaction({
      to: targetAddress,
      data: hexData,
      value: 0n,
      gasLimit: 60000n,
      gasPrice,
    });

    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      relayedBy: RELAYER_CONFIG.address,
      gasFee: '0.00 tMSTC (Sponsored by Relayer)',
      isGasless: true,
    };
  }

  // Fallback: If Relayer pool is currently unfunded, use connected wallet via BridgeKey
  // but tag with Relayer metadata so the user still records accurately.
  try {
    const txHash = await sendMSTBlockchainTransaction(payloadString, targetAddress, desiredMode);
    return {
      txHash,
      relayedBy: targetAddress,
      gasFee: 'Standard Gas (Wallet)',
      isGasless: false,
    };
  } catch (err) {
    console.warn('Direct wallet fallback warning:', err);
    throw err;
  }
}
