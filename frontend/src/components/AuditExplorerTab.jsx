import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Clock,
  UserCheck,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';
import { getReadOnlyContract, shortenAddress, getExplorerUrl } from '../utils/web3';
import { DEMO_SESSION } from '../constants';

export default function AuditExplorerTab({
  contractAddress,
  recentTransactions,
  voters,
}) {
  const [searchHash, setSearchHash] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);

  // Query on-chain smart contract
  const handleQuery = async (hashToQuery) => {
    const targetHash = hashToQuery || searchHash;
    if (!targetHash) return;

    setIsQuerying(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const contract = getReadOnlyContract(contractAddress);
      const res = await contract.verifyVoterAudit(DEMO_SESSION.id, targetHash.trim());

      if (!res[0]) {
        // exists === false
        setQueryError('No verification event found for this hash in the specified session.');
      } else {
        setQueryResult({
          exists: res[0],
          eventId: res[1].toString(),
          status: Number(res[2]), // 1=MATCHED, 2=MISMATCH
          confidenceScore: Number(res[3]),
          officer: res[4],
          timestamp: Number(res[5]),
          liveCaptureHash: res[6],
          remarks: res[7],
          recordHash: targetHash.trim(),
        });
      }
    } catch (err) {
      console.error('Query failed:', err);
      setQueryError(`Query failed: ${err.message}`);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Audit Explorer Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">MST Blockchain Audit Explorer</h2>
        <p className="text-sm text-slate-400 mt-1">
          Public, tamper-evident audit verification tool. Query any voter record hash directly against the deployed MST smart contract.
        </p>
      </div>

      {/* Query Bar Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
          Verify Record Hash On-Chain
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter Voter Record Hash (0x...) or select from presets below"
            value={searchHash}
            onChange={(e) => setSearchHash(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleQuery()}
            disabled={isQuerying || !searchHash}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {isQuerying ? 'Querying Blockchain...' : 'Verify on MST'}
          </button>
        </div>

        {/* Quick Hash Presets */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Quick Test Records:</span>
          {voters.slice(0, 3).map((v) => (
            <button
              key={v.id}
              onClick={() => {
                setSearchHash(v.recordHash);
                handleQuery(v.recordHash);
              }}
              className="px-2.5 py-1 text-[11px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            >
              {v.name} ({shortenAddress(v.recordHash)})
            </button>
          ))}
        </div>

        {/* Error message */}
        {queryError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{queryError}</span>
          </div>
        )}

        {/* Query Result Card */}
        {queryResult && (
          <div className="mt-4 p-5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">Authentic On-Chain Record Verified</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Event #{queryResult.eventId}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <p>
                  <span className="text-slate-500">Verification Outcome:</span>{' '}
                  <span
                    className={`font-semibold ${
                      queryResult.status === 1 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {queryResult.status === 1 ? 'MATCHED' : 'MANUAL_REVIEW'} ({queryResult.confidenceScore}%)
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Timestamp:</span>{' '}
                  <span className="text-slate-300">
                    {new Date(queryResult.timestamp * 1000).toLocaleString()}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Officer Address:</span>{' '}
                  <a
                    href={getExplorerUrl(queryResult.officer, 'address')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-400 underline"
                  >
                    {shortenAddress(queryResult.officer)}
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-slate-500">Presiding Officer Remarks:</p>
                <p className="text-slate-200 bg-slate-900 p-2 rounded border border-slate-800 text-[11px]">
                  {queryResult.remarks}
                </p>
                <p className="text-slate-500 text-[11px] truncate">
                  Live Snapshot Hash: <span className="font-mono text-slate-400">{queryResult.liveCaptureHash}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent On-Chain Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center justify-between">
          <span>Recent Verifications on MST Blockchain</span>
          <span className="text-xs text-slate-400 font-normal">Live Log</span>
        </h3>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No on-chain verifications submitted yet in this session. Go to the Polling Booth tab and commit a verification!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Voter</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Score</th>
                  <th className="py-3 px-3">Block</th>
                  <th className="py-3 px-3">Tx Hash</th>
                  <th className="py-3 px-3">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-sans font-semibold text-white">
                      {tx.voterName} ({tx.voterId})
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'Matched'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{tx.confidence}%</td>
                    <td className="py-3 px-3 text-slate-400">#{tx.blockNumber}</td>
                    <td className="py-3 px-3 text-slate-300">{shortenAddress(tx.txHash)}</td>
                    <td className="py-3 px-3 font-sans">
                      <a
                        href={getExplorerUrl(tx.txHash, 'tx')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline"
                      >
                        MSTScan <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architecture Highlights Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
            <Lock className="w-4 h-4" /> Zero PII on Blockchain
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Names, photographs, and biometrics remain off-chain. Only cryptographic Keccak-256 hashes are anchored.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs">
            <UserCheck className="w-4 h-4" /> Non-Repudiation
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every verification action is cryptographically signed by the booth officer's wallet.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" /> Double-Vote Immunity
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The smart contract tracks verified hashes per session, instantly reverting any duplicate vote attempts.
          </p>
        </div>
      </div>
    </div>
  );
}
