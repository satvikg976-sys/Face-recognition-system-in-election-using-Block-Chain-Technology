import React, { useState } from 'react';
import { createElection } from '../utils/db';

export default function CreateElectionPage({ officer, onElectionCreated, onCancel }) {
  // Blanks to fill:
  // 1. Name of the election
  const [electionName, setElectionName] = useState('');
  // 2. Booth name
  const [boothName, setBoothName] = useState(officer?.boothName || '');
  // 3. Number of voter in numbers (Strict limit)
  const [maxVoters, setMaxVoters] = useState('');
  // 4. Date and time (Start date/time and Expiry date/time)
  const [startDateTime, setStartDateTime] = useState(
    new Date(Date.now()).toISOString().slice(0, 16)
  );
  const [endDateTime, setEndDateTime] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );

  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleCreate = (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const voterCountNum = parseInt(maxVoters, 10);
    if (!voterCountNum || voterCountNum <= 0) {
      setErrorMessage('Please enter a valid positive number for the number of voters.');
      return;
    }

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      setErrorMessage('Expiry date and time must be after the start date and time.');
      return;
    }

    try {
      const newEl = createElection(
        electionName,
        boothName,
        voterCountNum,
        startDateTime,
        endDateTime
      );

      setSuccessMessage('Successfully created!');
      setTimeout(() => {
        onElectionCreated(newEl);
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Election Identity Verification System
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Configure Polling Session</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Create Election Session</h2>
            <p className="text-xs text-slate-500 mt-1">
              Fill in the blanks below to create an election session. Extra voters beyond the given capacity will not be allowed.
            </p>
          </div>

          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {successMessage} Redirecting to dashboard...
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            {/* 1st blank: Name of the election */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] inline-flex items-center justify-center font-bold">1</span>
                Name of the Election
              </label>
              <input
                type="text"
                placeholder="e.g. Maharashtra Assembly Election 2026"
                value={electionName}
                onChange={(e) => setElectionName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
              />
            </div>

            {/* 2nd blank: Booth name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] inline-flex items-center justify-center font-bold">2</span>
                Booth Name
              </label>
              <input
                type="text"
                placeholder="e.g. Booth 403 (Kohinoor World Tower, Pimpri)"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
              />
            </div>

            {/* 3rd blank: Number of voter in numbers */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] inline-flex items-center justify-center font-bold">3</span>
                  Number of Voters (Max Limit)
                </label>
                <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                  *Strict capacity limit enforced
                </span>
              </div>
              <input
                type="number"
                min="1"
                placeholder="e.g. 5"
                value={maxVoters}
                onChange={(e) => setMaxVoters(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
              />
            </div>

            {/* 4th blank: Date and time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] inline-flex items-center justify-center font-bold">4</span>
                Date & Time Schedule
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1 font-medium">Start Date & Time</span>
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1 font-medium">Expiry Date & Time</span>
                  <input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer mt-4"
            >
              Create Election Session
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-400 text-center">
        Election Identity Verification System • Step-by-Step Configuration
      </footer>
    </div>
  );
}
