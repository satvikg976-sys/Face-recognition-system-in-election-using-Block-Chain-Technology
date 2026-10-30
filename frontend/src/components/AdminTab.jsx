import React, { useState } from 'react';
import {
  PlusCircle,
  UserPlus,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getContractWithSigner, hashData, shortenAddress, getExplorerUrl } from '../utils/web3';
import { DEMO_SESSION } from '../constants';

export default function AdminTab({
  wallet,
  onConnect,
  contractAddress,
  onVoterAdded,
  voters,
}) {
  // Session Creation State
  const [city, setCity] = useState('Pune');
  const [area, setArea] = useState('Pimpri-Chinchwad');
  const [ward, setWard] = useState('Ward 12 - Kohinoor');
  const [boothName, setBoothName] = useState('Booth 403 (Kohinoor World Tower, Tower 3)');
  const [electionDate, setElectionDate] = useState('2026-11-01');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionTxHash, setSessionTxHash] = useState(null);

  // Officer Authorization State
  const [officerAddress, setOfficerAddress] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authTxHash, setAuthTxHash] = useState(null);

  // Voter Enrollment State
  const [newVoterId, setNewVoterId] = useState('');
  const [newVoterName, setNewVoterName] = useState('');
  const [newVoterWard, setNewVoterWard] = useState('Ward 12');
  const [newVoterAge, setNewVoterAge] = useState('28');
  const [newVoterGender, setNewVoterGender] = useState('Female');
  const [newVoterPhoto, setNewVoterPhoto] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80'
  );
  const [enrollSuccess, setEnrollSuccess] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Create Election Session on MST Blockchain
  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!wallet) {
      onConnect();
      return;
    }

    setIsCreatingSession(true);
    setStatusMessage(null);
    setSessionTxHash(null);

    try {
      const contract = await getContractWithSigner(contractAddress);
      const startTime = Math.floor(Date.now() / 1000);
      const endTime = startTime + 86400 * 7;

      const tx = await contract.createSession(
        city,
        area,
        ward,
        boothName,
        electionDate,
        startTime,
        endTime
      );
      const receipt = await tx.wait();

      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      setSessionTxHash(receipt.hash);
      setStatusMessage('Session created successfully on MST Blockchain!');
    } catch (err) {
      console.error(err);
      setStatusMessage(`Session creation failed: ${err.message}`);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Authorize Polling Officer on MST Blockchain
  const handleAuthorizeOfficer = async (e) => {
    e.preventDefault();
    if (!wallet) {
      onConnect();
      return;
    }
    if (!officerAddress) return;

    setIsAuthorizing(true);
    setStatusMessage(null);
    setAuthTxHash(null);

    try {
      const contract = await getContractWithSigner(contractAddress);
      const tx = await contract.authorizeOfficer(DEMO_SESSION.id, officerAddress.trim());
      const receipt = await tx.wait();

      confetti({ particleCount: 50, spread: 40, origin: { y: 0.6 } });
      setAuthTxHash(receipt.hash);
      setStatusMessage('Officer authorized on MST Blockchain!');
      setOfficerAddress('');
    } catch (err) {
      console.error(err);
      setStatusMessage(`Authorization failed: ${err.message}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Enrol Synthetic Voter Record (Computes Salted Cryptographic Hash Off-Chain)
  const handleEnrolVoter = (e) => {
    e.preventDefault();
    if (!newVoterId || !newVoterName) return;

    const salt = 'SALT_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const computedRecordHash = hashData(`${newVoterId}_${newVoterWard}_${salt}`);

    const newVoter = {
      id: newVoterId.trim(),
      name: newVoterName.trim(),
      ward: newVoterWard.trim(),
      age: parseInt(newVoterAge, 10),
      gender: newVoterGender,
      photoUrl: newVoterPhoto,
      secretSalt: salt,
      recordHash: computedRecordHash,
    };

    onVoterAdded(newVoter);
    setEnrollSuccess(newVoter);

    // Reset fields
    setNewVoterId('');
    setNewVoterName('');
  };

  return (
    <div className="space-y-8">
      {/* Admin Panel Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Election Administrator Console</h2>
        <p className="text-sm text-slate-400 mt-1">
          Configure booth sessions, authorize polling officers on MST Blockchain, and manage voter biometric rolls with zero on-chain personal data exposure.
        </p>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs">
          {statusMessage}
        </div>
      )}

      {/* Grid: Session Config & Officer Authorization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: Create Session */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Create Election Booth Session</h3>
              <p className="text-xs text-slate-400">Deploys new immutable session parameters to MST Blockchain</p>
            </div>
          </div>

          <form onSubmit={handleCreateSession} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Area</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Ward</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Election Date</label>
                <input
                  type="date"
                  value={electionDate}
                  onChange={(e) => setElectionDate(e.target.value)}
                  className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Polling Booth Name / Location</label>
              <input
                type="text"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingSession}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {isCreatingSession ? 'Publishing to MST Blockchain...' : 'Deploy Session on MST Blockchain'}
            </button>
          </form>

          {sessionTxHash && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center justify-between text-emerald-400">
              <span>Session Initialized!</span>
              <a
                href={getExplorerUrl(sessionTxHash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 underline font-mono text-[11px]"
              >
                {shortenAddress(sessionTxHash)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Card 2: Authorize Polling Officer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white">Authorize Polling Officer</h3>
              <p className="text-xs text-slate-400">Grants booth operator permission to submit verification transactions</p>
            </div>
          </div>

          <form onSubmit={handleAuthorizeOfficer} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Session ID</label>
              <input
                type="text"
                readOnly
                value={DEMO_SESSION.id}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono truncate"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Officer Wallet Address</label>
              <input
                type="text"
                placeholder="0x..."
                value={officerAddress}
                onChange={(e) => setOfficerAddress(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Enter the wallet public address of the polling officer.
              </p>
            </div>

            <button
              type="submit"
              disabled={isAuthorizing}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:purple-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {isAuthorizing ? 'Authorizing on-chain...' : 'Authorize Officer via Wallet'}
            </button>
          </form>

          {authTxHash && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs flex items-center justify-between text-purple-400">
              <span>Officer Permission Granted!</span>
              <a
                href={getExplorerUrl(authTxHash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 underline font-mono text-[11px]"
              >
                {shortenAddress(authTxHash)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Security Architecture:</p>
            <p>
              Only addresses registered as authorized officers or contract admin can invoke the{' '}
              <code className="text-indigo-300">recordVerification</code> function on MST Blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Voter Enrollment Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white">Pre-Poll Voter Biometric Enrollment</h3>
            <p className="text-xs text-slate-400">
              Generates cryptographic salted hash for new voters. PII and photographs remain strictly off-chain.
            </p>
          </div>
        </div>

        <form onSubmit={handleEnrolVoter} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-400 font-medium">Voter ID</label>
            <input
              type="text"
              placeholder="e.g. IND-VOTER-2026-005"
              value={newVoterId}
              onChange={(e) => setNewVoterId(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Rajesh Verma"
              value={newVoterName}
              onChange={(e) => setNewVoterName(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Ward</label>
            <input
              type="text"
              value={newVoterWard}
              onChange={(e) => setNewVoterWard(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Age</label>
            <input
              type="number"
              value={newVoterAge}
              onChange={(e) => setNewVoterAge(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Gender</label>
            <select
              value={newVoterGender}
              onChange={(e) => setNewVoterGender(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium">Reference Photo URL</label>
            <input
              type="url"
              value={newVoterPhoto}
              onChange={(e) => setNewVoterPhoto(e.target.value)}
              className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Enrol Voter & Generate Salted Hash
            </button>
          </div>
        </form>

        {enrollSuccess && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Sparkles className="w-4 h-4" />
              Voter Enrolled in Local Protected Registry!
            </div>
            <p className="text-slate-300">
              Voter <strong className="text-white">{enrollSuccess.name}</strong> ({enrollSuccess.id}) enrolled.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400 break-all">
              Generated Hash: {enrollSuccess.recordHash}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
