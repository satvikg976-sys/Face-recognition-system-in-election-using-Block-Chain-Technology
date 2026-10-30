import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { MST_TESTNET_CONFIG } from '../constants';

export default function Footer({ contractAddress }) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 mt-16 py-10 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="font-bold text-white">MST VoteGuard</span>
            <span>• Built for MST Blockchain Buildathon 2.0</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <a
              href="https://docs.mstblockchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              MST Docs <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://testnet.mstscan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              MSTScan <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://coral-faucet.mstblockchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Testnet Faucet <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://bridgekey.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Wallet <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>
            Connected to <strong>{MST_TESTNET_CONFIG.chainName}</strong> (Chain ID: {MST_TESTNET_CONFIG.chainIdDecimal}) • RPC:{' '}
            <code className="text-slate-400">{MST_TESTNET_CONFIG.rpcUrls[0]}</code>
          </p>
          <p>Demo & Evaluation Prototype • Privacy Preserved (Zero Biometrics On-Chain)</p>
        </div>
      </div>
    </footer>
  );
}
