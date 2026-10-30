import React, { useState } from 'react';
import { registerOfficer, loginOfficer } from '../utils/db';

export default function AuthPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [boothName, setBoothName] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    setIsError(false);

    try {
      if (mode === 'register') {
        registerOfficer(boothName, officerName, password);
        setMessage('Registration successful! You can now log in.');
        setMode('login');
      } else {
        const officer = loginOfficer(boothName, officerName, password);
        onLoginSuccess(officer);
      }
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  };

  const handleFillDemo = () => {
    setBoothName('Booth 403 Pimpri');
    setOfficerName('Satvik');
    setPassword('password123');
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50/50 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background blur orbs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Colorful Header & Title */}
      <div className="text-center mb-8 relative z-10 max-w-lg">
        {/* Colorful Emblem Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/25 mb-4 ring-4 ring-white">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        {/* Colorful Gradient Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Election Identity Verification System
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
          MST Blockchain Secured Voter Identification & Polling Management
        </p>

        <div className="mt-2.5 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 border border-indigo-200 text-indigo-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            MST Testnet (Chain ID 91562037)
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 border border-purple-200 text-purple-700">
            AI Biometrics 128D
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/50 p-8 relative z-10">
        {/* Colorful Register and Login Toggle Buttons */}
        <div className="flex p-1.5 bg-slate-100 rounded-xl mb-6 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Officer Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setMessage(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.01]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Register Officer
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-5 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              isError
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            <span>{isError ? '⚠️' : '✓'}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Booth Name
            </label>
            <input
              type="text"
              placeholder="e.g. Booth 403 Pimpri"
              value={boothName}
              onChange={(e) => setBoothName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Officer Name
            </label>
            <input
              type="text"
              placeholder="e.g. Satvik"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 px-4 font-bold text-sm rounded-xl text-white shadow-lg transition-all cursor-pointer mt-2 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-indigo-500/25 hover:shadow-indigo-500/40'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-purple-500/25 hover:shadow-purple-500/40'
            }`}
          >
            {mode === 'login' ? 'Login to Polling Portal' : 'Register Official Account'}
          </button>
        </form>

        {/* Demo Shortcut */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-500">Quick Testing:</span>
          <button
            type="button"
            onClick={handleFillDemo}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg transition-all cursor-pointer shadow-xs"
          >
            Fill Demo Credentials ⚡
          </button>
        </div>
      </div>

      {/* Footer info */}
      <p className="mt-8 text-xs text-slate-400 text-center relative z-10">
        MST VoteGuard • Decentralized Identity Verification with 128D AI Biometrics
      </p>
    </div>
  );
}
