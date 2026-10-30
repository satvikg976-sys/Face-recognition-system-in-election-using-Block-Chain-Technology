import React from 'react';
import { ShieldCheck, Wallet, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { shortenAddress, getExplorerUrl } from '../utils/web3';
import { MST_TESTNET_CONFIG } from '../constants';

export default function Navbar({
  wallet,
  isConnecting,
  onConnect,
  onSwitchNetwork,
  activeTab,
  setActiveTab,
  contractAddress,
}) {
  const isCorrectNetwork = wallet?.chainId === MST_TESTNET_CONFIG.chainIdDecimal;

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Project Branding */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">MST VoteGuard</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full uppercase tracking-wider">
                  Testnet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Face Recognition & Blockchain Audit Trail • Buildathon 2.0
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('booth')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'booth'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Polling Booth
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Election Admin
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Audit Explorer
            </button>
          </nav>

          {/* Wallet & Network Info */}
          <div className="flex items-center gap-3">
            {wallet ? (
              <div className="flex items-center gap-2">
                {!isCorrectNetwork ? (
                  <button
                    onClick={onSwitchNetwork}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Switch to MST Testnet
                  </button>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    MST Testnet (91562037)
                  </div>
                )}

                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-200">
                      {shortenAddress(wallet.account)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {parseFloat(wallet.balance).toFixed(3)} tMSTC
                    </p>
                  </div>
                  <a
                    href={getExplorerUrl(wallet.account, 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-indigo-400 transition-colors p-1"
                    title="View on MSTScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={isConnecting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="flex md:hidden gap-1 py-2 border-t border-slate-900">
          <button
            onClick={() => setActiveTab('booth')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'booth' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-900'
            }`}
          >
            Booth
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg text-center ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-slate-400 bg-slate-900'
            }`}
          >
            Audit
          </button>
        </div>
      </div>
    </header>
  );
}
