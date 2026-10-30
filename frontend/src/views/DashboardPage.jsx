import React from 'react';
import { getSessionStatus } from '../utils/db';

export default function DashboardPage({
  officer,
  elections,
  onNavigateCreate,
  onSelectElection,
  onLogout,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col justify-between">
      {/* Header with Title and Details */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Colorful Icon Badge */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Election Identity Verification System
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Booth: <strong className="text-slate-700">{officer?.boothName}</strong> • Officer:{' '}
                <strong className="text-indigo-600">{officer?.officerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
            {/* Gas Free Payment Service Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold shadow-xs"
              title="Gas Free Payment Service active for all sessions"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>⚡ Payment:</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                Gas Free
              </span>
            </div>

            {/* Wallet Status Badge */}
            <a
              href="https://testnet.mstscan.com/address/0x599D7ea9176441708d8973031f04D05674927668"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 hover:from-blue-100 hover:to-indigo-100 transition-all shadow-xs"
              title="View on MSTScan Explorer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-slate-700">0x599D...7668</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                60.00 tMSTC
              </span>
            </a>

            {/* Top Right Corner Button: voter list for election */}
            <button
              onClick={onNavigateCreate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              + Voter list for election
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Election Sessions & History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click on any session card below to manage voters, take live photos, and verify identities on MST Blockchain.
            </p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">
            {elections.length} Total Sessions
          </span>
        </div>

        {elections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              📋
            </div>
            <p className="text-sm text-slate-700 font-bold">No election sessions created yet.</p>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Click the "+ Voter list for election" button above to create your first election session.
            </p>
            <button
              onClick={onNavigateCreate}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Create Election Session
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {elections.map((elec) => {
              const status = getSessionStatus(elec.startTime, elec.endTime, elec.isCompleted);
              const startFormatted = new Date(elec.startTime).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              const endFormatted = new Date(elec.endTime).toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={elec.id}
                  onClick={() => onSelectElection(elec)}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.005] ${
                    status.type === 'ONGOING'
                      ? 'border-emerald-300/80 border-l-4 border-l-emerald-500'
                      : status.type === 'UPCOMING'
                      ? 'border-amber-300/80 border-l-4 border-l-amber-500'
                      : 'border-slate-200 border-l-4 border-l-slate-400'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-800 hover:text-indigo-600 transition-colors">
                          {elec.name}
                        </h3>
                        <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md font-semibold">
                          {elec.boothName}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-600 flex flex-wrap gap-x-5 gap-y-1">
                        <span>
                          <strong className="text-slate-700">Start:</strong> {startFormatted}
                        </span>
                        <span>
                          <strong className="text-slate-700">Expiry:</strong> {endFormatted}
                        </span>
                        <span>
                          <strong className="text-slate-700">Capacity:</strong>{' '}
                          <span className="font-bold text-indigo-700">{elec.voters.length}</span> / {elec.maxVoters} Voters
                        </span>
                      </div>
                    </div>

                    {/* Status badge at right */}
                    <div className="shrink-0 self-start sm:self-center">
                      {status.type === 'ONGOING' && (
                        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                          Ongoing Session (Active)
                        </span>
                      )}

                      {status.type === 'UPCOMING' && (
                        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-xs">
                          ⏱️ {status.label}
                        </span>
                      )}

                      {status.type === 'COMPLETED' && (
                        <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          ✓ Completed (Blockchain History)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer with Title and Details */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-xs text-slate-500 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Election Identity Verification System • Government Polling Audit</span>
          <span className="font-mono text-slate-400">Powered by MST Blockchain & Dlib 128D AI Biometrics</span>
        </div>
      </footer>
    </div>
  );
}
