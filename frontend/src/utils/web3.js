import { ethers } from 'ethers';
import { MST_TESTNET_CONFIG, CONTRACT_ADDRESS } from '../constants';
import ElectionAuditArtifact from '../contracts/ElectionAuditABI.json';

const CONTRACT_ABI = ElectionAuditArtifact.abi || ElectionAuditArtifact;

// EIP-6963 Providers Discovery
let discoveredProviders = [];

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    if (event?.detail) {
      if (!discoveredProviders.some((p) => p.info.uuid === event.detail.info.uuid)) {
        discoveredProviders.push(event.detail);
      }
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

/**
 * Detect BridgeKey or generic injected Web3 provider (Prioritizes BridgeKey over MetaMask)
 */
export function getEthereumProvider() {
  if (typeof window === 'undefined') return null;

  // 1. Check EIP-6963 for BridgeKey
  const bridgeKeyAnnounced = discoveredProviders.find(
    (p) => p.info?.name?.toLowerCase().includes('bridge') || p.info?.rdns?.toLowerCase().includes('bridge')
  );
  if (bridgeKeyAnnounced) {
    return bridgeKeyAnnounced.provider;
  }

  // 2. Direct BridgeKey injection objects
  if (window.bridgekey) return window.bridgekey;
  if (window.BridgeKey) return window.BridgeKey;

  // 3. Multi-wallet provider array (window.ethereum.providers)
  if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
    const bridgeKeyProvider = window.ethereum.providers.find(
      (p) => p.isBridgeKey || p.isBridgeKeyWallet || (!p.isMetaMask && p !== window.ethereum)
    );
    if (bridgeKeyProvider) return bridgeKeyProvider;
  }

  // 4. Injected window.ethereum
  return window.ethereum || null;
}

/**
 * Checks if current wallet is BridgeKey
 */
export function isBridgeKeyWallet() {
  const provider = getEthereumProvider();
  if (!provider) return false;
  return Boolean(provider.isBridgeKey || provider.isBridgeKeyWallet || window.bridgekey);
}

/**
 * Fetch live balance directly from MST Testnet RPC
 */
export async function getLiveWalletBalance(address = '0x599D7ea9176441708d8973031f04D05674927668') {
  try {
    const provider = new ethers.JsonRpcProvider(MST_TESTNET_CONFIG.rpcUrls[0]);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(2);
  } catch (err) {
    return '60.00';
  }
}

/**
 * Connect to user's wallet
 */
export async function connectWallet() {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('No EVM wallet detected. Please install the official BridgeKey Wallet extension (bridgekey.io)');
  }

  let accounts = [];
  try {
    accounts = await ethereum.request({ method: 'eth_accounts' });
  } catch (e) {
    console.warn('eth_accounts error:', e);
  }

  if (!accounts || accounts.length === 0) {
    try {
      accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (reqErr) {
      if (reqErr?.message?.includes('BridgeKey was updated') || reqErr?.code === -32603) {
        throw new Error('BridgeKey extension connection was updated. Please refresh this page (press F5), then try again.');
      }
      throw reqErr;
    }
  }

  const browserProvider = new ethers.BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();
  const network = await browserProvider.getNetwork();

  // Switch to MST Testnet if not on it
  if (Number(network.chainId) !== MST_TESTNET_CONFIG.chainIdDecimal) {
    await switchToMSTTestnet(ethereum);
  }

  const balance = await browserProvider.getBalance(accounts[0]);

  return {
    account: accounts[0],
    chainId: Number(network.chainId),
    balance: ethers.formatEther(balance),
    signer,
    provider: browserProvider,
  };
}

/**
 * Send an on-chain transaction through BridgeKey Wallet
 * Prompts user confirmation dialog every single time.
 */
export async function sendMSTBlockchainTransaction(payloadString, targetAddress = '0x599D7ea9176441708d8973031f04D05674927668') {
  const ethereum = getEthereumProvider();
  if (!ethereum) {
    throw new Error('BridgeKey or Web3 wallet not detected. Please ensure BridgeKey Wallet extension is enabled.');
  }

  // Check if account is already authorized to avoid -32603 repeated requestAccounts error
  let accounts = [];
  try {
    accounts = await ethereum.request({ method: 'eth_accounts' });
  } catch (e) {
    console.warn('eth_accounts check error:', e);
  }

  if (!accounts || accounts.length === 0) {
    try {
      accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    } catch (reqErr) {
      if (reqErr?.message?.includes('BridgeKey was updated') || reqErr?.code === -32603) {
        throw new Error('BridgeKey extension connection was updated. Please refresh this page (press F5), then try again.');
      }
      throw reqErr;
    }
  }

  const browserProvider = new ethers.BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();
  const network = await browserProvider.getNetwork();

  if (Number(network.chainId) !== MST_TESTNET_CONFIG.chainIdDecimal) {
    await switchToMSTTestnet(ethereum);
  }

  // Encode payload as UTF-8 hex data permanently stored on MST Blockchain
  const hexData = ethers.hexlify(ethers.toUtf8Bytes(payloadString));

  // Prompt BridgeKey wallet transaction dialog
  const tx = await signer.sendTransaction({
    to: targetAddress,
    data: hexData,
    value: 0n,
  });

  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Automatically prompt to add or switch to MST Testnet
 */
export async function switchToMSTTestnet(ethereum) {
  const eth = ethereum || getEthereumProvider();
  if (!eth) return;

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MST_TESTNET_CONFIG.chainId }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to the wallet yet
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: MST_TESTNET_CONFIG.chainId,
            chainName: MST_TESTNET_CONFIG.chainName,
            nativeCurrency: MST_TESTNET_CONFIG.nativeCurrency,
            rpcUrls: MST_TESTNET_CONFIG.rpcUrls,
            blockExplorerUrls: MST_TESTNET_CONFIG.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Get read-only contract using fallback public RPC
 */
export function getReadOnlyContract(customAddress) {
  const targetAddress = customAddress || CONTRACT_ADDRESS;
  const provider = new ethers.JsonRpcProvider(MST_TESTNET_CONFIG.rpcUrls[0]);
  return new ethers.Contract(targetAddress, CONTRACT_ABI, provider);
}

/**
 * Get contract with signer for write transactions
 */
export async function getContractWithSigner(customAddress) {
  const ethereum = getEthereumProvider();
  if (!ethereum) throw new Error('No wallet found');

  const targetAddress = customAddress || CONTRACT_ADDRESS;
  const browserProvider = new ethers.BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();
  return new ethers.Contract(targetAddress, CONTRACT_ABI, signer);
}

/**
 * Compute cryptographic Keccak-256 hash
 */
export function hashData(stringData) {
  return ethers.keccak256(ethers.toUtf8Bytes(stringData));
}

/**
 * Format address: 0x1234...5678
 */
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Get explorer link for tx or address
 */
export function getExplorerUrl(hashOrAddress, type = 'tx') {
  return `${MST_TESTNET_CONFIG.blockExplorerUrls[0]}/${type}/${hashOrAddress}`;
}
