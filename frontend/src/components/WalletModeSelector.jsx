import React, { useState, useEffect, useRef } from 'react';
import { Globe, Zap, Check, ChevronDown, ExternalLink } from 'lucide-react';
import { WALLET_MODES } from '../constants';

export function getActiveWalletMode() {
  if (typeof window === 'undefined') return WALLET_MODES[0];
  const storedId = localStorage.getItem('mst_wallet_mode') || 'testnet';
  return WALLET_MODES.find((m) => m.id === storedId) || WALLET_MODES[0];
}

export function setActiveWalletMode(modeId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mst_wallet_mode', modeId);
    window.dispatchEvent(new Event('wallet_mode_changed'));
  }
}

export default function WalletModeSelector({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(getActiveWalletMode());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleModeChange = () => {
      setActiveMode(getActiveWalletMode());
    };
    window.addEventListener('wallet_mode_changed', handleModeChange);
    return () => window.removeEventListener('wallet_mode_changed', handleModeChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modeId) => {
    setActiveWalletMode(modeId);
    setActiveMode(WALLET_MODES.find((m) => m.id === modeId) || WALLET_MODES[0]);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 via-white to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-indigo-200 rounded-xl text-xs text-indigo-950 transition-all shadow-xs cursor-pointer hover:shadow-sm"
        title="Click to switch Wallet execution mode: Testnet, Mainnet, or Without Wallet"
      >
        <span className={`w-2 h-2 rounded-full ${activeMode.dotColor} animate-pulse`} />
        
        <span className="font-mono font-bold text-slate-700">
          {activeMode.shortAddress}
        </span>

        <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] border ${activeMode.badgeClass}`}>
          {activeMode.balance}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Select Wallet Execution Mode
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Choose blockchain network or run without any wallet extension.
            </p>
          </div>

          <div className="space-y-1">
            {WALLET_MODES.map((mode) => {
              const isSelected = activeMode.id === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleSelect(mode.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-xs'
                      : 'border-transparent hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="pt-0.5">
                    {mode.id === 'no_wallet' ? (
                      <Zap className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                    ) : (
                      <Globe className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {mode.label}
                      </span>
                      {isSelected && (
                        <span className="bg-indigo-600 text-white rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {mode.description}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-0.2 rounded font-semibold border ${mode.badgeClass}`}>
                        {mode.balance}
                      </span>
                      {mode.chainId && (
                        <span className="text-slate-400 font-mono">
                          Chain ID: {mode.chainId}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {activeMode.explorerUrl && (
            <div className="mt-2 pt-2 border-t border-slate-100 px-3 py-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>View Explorer:</span>
              <a
                href={activeMode.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                {activeMode.shortLabel} Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
