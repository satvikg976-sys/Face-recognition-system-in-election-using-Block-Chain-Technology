export const MST_TESTNET_CONFIG = {
  chainId: '0x5752035', // 91562037 in hex
  chainIdDecimal: 91562037,
  chainName: 'MST Testnet',
  nativeCurrency: {
    name: 'MSTC Token',
    symbol: 'tMSTC',
    decimals: 18,
  },
  rpcUrls: ['https://testnetrpc.mstblockchain.com'],
  blockExplorerUrls: ['https://testnet.mstscan.com'],
};

export const MST_MAINNET_CONFIG = {
  chainId: '0x1226', // 4646 in hex
  chainIdDecimal: 4646,
  chainName: 'MST Mainnet',
  nativeCurrency: {
    name: 'MSTC Token',
    symbol: 'MSTC',
    decimals: 18,
  },
  rpcUrls: ['https://mariorpc.mstblockchain.com/'],
  blockExplorerUrls: ['https://mstscan.com'],
};

export const WALLET_MODES = [
  {
    id: 'testnet',
    label: 'MST Testnet',
    shortLabel: 'Testnet',
    currency: 'tMSTC',
    balance: '60.00 tMSTC',
    chainId: 91562037,
    chainIdHex: '0x5752035',
    address: '0x599D7ea9176441708d8973031f04D05674927668',
    shortAddress: '0x599D...7668',
    explorerUrl: 'https://testnet.mstscan.com/address/0x599D7ea9176441708d8973031f04D05674927668',
    txExplorerBase: 'https://testnet.mstscan.com/tx',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dotColor: 'bg-emerald-500',
    description: 'Active MST Testnet with funded 60.00 tMSTC officer wallet.',
  },
  {
    id: 'mainnet',
    label: 'MST Mainnet',
    shortLabel: 'Mainnet',
    currency: 'MSTC',
    balance: '10.00 MSTC',
    chainId: 4646,
    chainIdHex: '0x1226',
    address: '0x599D7ea9176441708d8973031f04D05674927668',
    shortAddress: '0x599D...7668',
    explorerUrl: 'https://mstscan.com/address/0x599D7ea9176441708d8973031f04D05674927668',
    txExplorerBase: 'https://mstscan.com/tx',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dotColor: 'bg-purple-500',
    description: 'Live MST Mainnet production blockchain environment (10.00 MSTC).',
  },
  {
    id: 'no_wallet',
    label: 'Without Wallet Execution',
    shortLabel: 'Without Wallet',
    currency: 'Gas-Free',
    balance: '0 Gas (No Wallet)',
    chainId: null,
    address: 'Decentralized Relayer',
    shortAddress: 'No Wallet Req.',
    explorerUrl: null,
    txExplorerBase: null,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotColor: 'bg-amber-500',
    description: 'Instant verification without requiring any browser wallet extension.',
  },
];

// Fallback or currently deployed contract address
export const CONTRACT_ADDRESS = '0xa6fc5ffD7D2109A035d8F1035A56e4959EA538CA';

// Officer BridgeKey Wallet Address (Funded with 60 tMSTC on Testnet)
export const DEFAULT_OFFICER_WALLET = '0x599D7ea9176441708d8973031f04D05674927668';

// Default active session for demonstration
export const DEMO_SESSION = {
  id: '0x7b62985fc858c8942b0c395ffad3d4bf3df211832d20fa56fa763c3d5e90d1bf',
  city: 'Pune',
  area: 'Pimpri-Chinchwad',
  ward: 'Ward 12 - Kohinoor',
  boothName: 'Booth 403 (Kohinoor World Tower, Tower 3)',
  date: '2026-11-01',
  status: 'Active',
};

// Sample pre-enrolled synthetic voters for testing
export const INITIAL_VOTERS = [
  {
    id: 'IND-VOTER-2026-001',
    name: 'Aarav Sharma',
    age: 29,
    gender: 'Male',
    ward: 'Ward 12',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
    secretSalt: 'SALT_AARAV_98124',
    // Keccak256 hash calculated from (id + ward + secretSalt)
    recordHash: '0x4f885e3474d283e71d3eb21c7bc698ebae392d47da15ba9d164db1d9e9e1bb39',
  },
  {
    id: 'IND-VOTER-2026-002',
    name: 'Priya Patel',
    age: 34,
    gender: 'Female',
    ward: 'Ward 12',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    secretSalt: 'SALT_PRIYA_48211',
    recordHash: '0x9d54a205a2be10c73e1c667a421ea0283c847d9595f68b753d072f9a2655bf92',
  },
  {
    id: 'IND-VOTER-2026-003',
    name: 'Rahul Deshmukh',
    age: 42,
    gender: 'Male',
    ward: 'Ward 12',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    secretSalt: 'SALT_RAHUL_77192',
    recordHash: '0x3a48e775a2bc001859c0d38e217d83cbdf7643b918349faec35051a657c9103b',
  },
  {
    id: 'IND-VOTER-2026-004',
    name: 'Ananya Kulkarni',
    age: 26,
    gender: 'Female',
    ward: 'Ward 12',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
    secretSalt: 'SALT_ANANYA_33091',
    recordHash: '0x6e9f82bc401bca26289d0263f1143891b98a0d720b001a1538356f6c91a0c4f8',
  },
];
