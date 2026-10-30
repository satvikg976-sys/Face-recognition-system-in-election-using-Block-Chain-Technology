import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  ExternalLink,
  UserCheck,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Hash,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { captureVideoFrame, compareFaces } from '../utils/faceMatching';
import { getContractWithSigner, shortenAddress, getExplorerUrl } from '../utils/web3';
import { DEMO_SESSION } from '../constants';

export default function BoothVerificationTab({
  voters,
  wallet,
  onConnect,
  contractAddress,
  onVerificationLogged,
}) {
  const [selectedVoter, setSelectedVoter] = useState(voters[0] || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Start webcam
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      setErrorMessage('Could not open camera. You can still test with simulated camera captures below.');
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // Handle capture from live webcam
  const handleCaptureLive = async (isForcedMismatch = false) => {
    if (!selectedVoter) return;
    setIsComparing(true);
    setErrorMessage(null);
    setTxSuccess(null);

    let snapshotData = null;

    if (isCameraActive && videoRef.current) {
      try {
        snapshotData = await captureVideoFrame(videoRef.current);
      } catch (err) {
        console.error(err);
      }
    }

    // Fallback if camera is not opened: generate synthetic live snapshot
    if (!snapshotData) {
      const mockPhoto = isForcedMismatch
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80'
        : selectedVoter.photoUrl;
      snapshotData = {
        dataUrl: mockPhoto,
        frameHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        timestamp: Date.now(),
      };
    }

    setLiveSnapshot(snapshotData);

    // Run facial comparison analysis
    const result = await compareFaces(snapshotData.dataUrl, selectedVoter.photoUrl, isForcedMismatch);
    setComparisonResult({
      ...result,
      liveCaptureHash: snapshotData.frameHash,
    });
    setIsComparing(false);
  };

  // Commit on-chain to MST Blockchain via BridgeKey
  const handleCommitToBlockchain = async () => {
    if (!wallet) {
      onConnect();
      return;
    }
    if (!comparisonResult || !selectedVoter) return;

    setIsCommitting(true);
    setErrorMessage(null);
    setTxSuccess(null);

    try {
      const contract = await getContractWithSigner(contractAddress);

      // Status enum in Solidity: 0=PENDING, 1=MATCHED, 2=MISMATCH_MANUAL_REVIEW, 3=REJECTED
      const statusEnum = comparisonResult.status;
      const remarks =
        statusEnum === 1
          ? `Biometric match confirmed for ${selectedVoter.name} (${selectedVoter.id})`
          : `Facial mismatch flagged for ${selectedVoter.name} - routed to presiding officer manual check`;

      console.log('Sending transaction to MST Blockchain...');
      const tx = await contract.recordVerification(
        DEMO_SESSION.id,
        selectedVoter.recordHash,
        comparisonResult.liveCaptureHash,
        statusEnum,
        comparisonResult.confidence,
        remarks
      );

      console.log('Tx sent, waiting for receipt...', tx.hash);
      const receipt = await tx.wait();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });

      const newTxInfo = {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: statusEnum === 1 ? 'Matched' : 'Manual Review',
        confidence: comparisonResult.confidence,
        voterId: selectedVoter.id,
        voterName: selectedVoter.name,
        recordHash: selectedVoter.recordHash,
        timestamp: Date.now(),
      };

      setTxSuccess(newTxInfo);
      if (onVerificationLogged) {
        onVerificationLogged(newTxInfo);
      }
    } catch (err) {
      console.error('Blockchain commit failed:', err);
      let msg = err?.message || 'Transaction failed on MST Blockchain.';
      if (msg.includes('Duplicate verification attempt detected')) {
        msg = 'Double-Voting Prevention Alert: This voter record was already verified in this session!';
      }
      setErrorMessage(msg);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Active Session Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Session Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {DEMO_SESSION.city} • {DEMO_SESSION.ward}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {DEMO_SESSION.boothName}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Election Date: <span className="text-indigo-300">{DEMO_SESSION.date}</span> • Session Hash:{' '}
              <span className="font-mono text-xs text-slate-400">
                {shortenAddress(DEMO_SESSION.id)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5">
            <UserCheck className="w-5 h-5 text-indigo-400" />
            <div className="text-xs">
              <p className="text-slate-400">Verifying Officer</p>
              <p className="font-semibold text-slate-200">
                {wallet ? shortenAddress(wallet.account) : 'Wallet Not Connected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Verification Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Voter Selector & Enrolled Reference (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>1. Enrolled Voter Roll</span>
              <span className="text-xs text-indigo-400 lowercase font-normal">
                {voters.length} synthetic records
              </span>
            </h3>

            {/* Voter Selector List */}
            <div className="space-y-2 mb-5">
              {voters.map((v) => {
                const isSelected = selectedVoter?.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVoter(v);
                      setLiveSnapshot(null);
                      setComparisonResult(null);
                      setTxSuccess(null);
                      setErrorMessage(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <img
                      src={v.photoUrl}
                      alt={v.name}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{v.name}</p>
                      <p className="text-xs text-slate-400 font-mono truncate">{v.id}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Voter Reference Card */}
            {selectedVoter && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Enrolled Reference Details
                </p>
                <div className="flex gap-4">
                  <img
                    src={selectedVoter.photoUrl}
                    alt={selectedVoter.name}
                    className="w-24 h-28 rounded-lg object-cover border-2 border-indigo-500/40 shadow"
                  />
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p>
                      <span className="text-slate-500">Name:</span>{' '}
                      <span className="font-semibold text-white">{selectedVoter.name}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Voter ID:</span>{' '}
                      <span className="font-mono text-indigo-300">{selectedVoter.id}</span>
                    </p>
                    <p>
                      <span className="text-slate-500">Ward:</span> {selectedVoter.ward}
                    </p>
                    <p>
                      <span className="text-slate-500">Age / Gender:</span> {selectedVoter.age} /{' '}
                      {selectedVoter.gender}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                  <p className="text-slate-500 flex items-center gap-1 mb-1">
                    <Hash className="w-3 h-3 text-slate-400" /> Salted Record Hash (Off-Chain):
                  </p>
                  <p className="font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {selectedVoter.recordHash}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    *Personal identity and biometrics are never stored on-chain. Only this hash is verified.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Camera & Face Matching Comparison (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  2. Booth Live Biometric Capture
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Capture voter face at polling desk and verify match against enrolled reference image.
                </p>
              </div>

              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20"
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Enable Webcam
                </button>
              )}
            </div>

            {/* Dual Frame Comparison Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Enrolled Photo */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-400 mb-2">
                  [1] Official Electoral Roll Photo
                </span>
                {selectedVoter ? (
                  <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                    <img
                      src={selectedVoter.photoUrl}
                      alt="Enrolled voter"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] text-emerald-400 border border-emerald-500/30">
                      Approved Reference
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-56 rounded-lg bg-slate-900 border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
                    Select a voter
                  </div>
                )}
              </div>

              {/* Box 2: Live Webcam / Capture */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center">
                <span className="text-xs font-semibold text-slate-400 mb-2">
                  [2] Polling Desk Live Video Feed
                </span>
                <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                  />
                  {!isCameraActive && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                      {liveSnapshot ? (
                        <img
                          src={liveSnapshot.dataUrl}
                          alt="Captured face"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="space-y-2">
                          <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-400">Live camera inactive</p>
                          <p className="text-[10px] text-slate-500">
                            Click 'Enable Webcam' or use the simulation buttons below
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Facial mesh scanner overlay effect */}
                  {isComparing && (
                    <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="text-center text-xs text-white font-mono flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        Comparing Facial Embeddings...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleCaptureLive(false)}
                disabled={isComparing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                Capture & Match Live Face
              </button>
            </div>

            {/* Comparison Results Card */}
            {comparisonResult && (
              <div
                className={`mt-6 p-5 rounded-2xl border transition-all ${
                  comparisonResult.isMatch
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-amber-950/30 border-amber-500/40'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {comparisonResult.isMatch ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold tracking-wide uppercase ${
                            comparisonResult.isMatch ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {comparisonResult.statusLabel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                          Score: {comparisonResult.confidence}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        {comparisonResult.decision}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-1">
                        Live Snapshot Hash: {shortenAddress(comparisonResult.liveCaptureHash)}
                      </p>
                    </div>
                  </div>

                  {/* Blockchain Commit Action */}
                  <div className="shrink-0">
                    <button
                      onClick={handleCommitToBlockchain}
                      disabled={isCommitting}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isCommitting
                        ? 'Signing on Wallet...'
                        : 'Commit Audit to MST Blockchain'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error / Alert Display */}
            {errorMessage && (
              <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Transaction Success On-Chain Proof */}
            {txSuccess && (
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-950 border border-indigo-500/50 shadow-2xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  Transaction Confirmed on MST Blockchain!
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Voter:</span>
                    <p className="font-bold text-white mt-0.5">
                      {txSuccess.voterName} ({txSuccess.voterId})
                    </p>
                    <span className="text-slate-400 mt-2 block">Outcome:</span>
                    <span className="text-emerald-400 font-semibold">{txSuccess.status} ({txSuccess.confidence}%)</span>
                  </div>
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Block Number:</span>
                    <p className="font-mono text-white mt-0.5">#{txSuccess.blockNumber}</p>
                    <span className="text-slate-400 mt-2 block">MSTScan Explorer:</span>
                    <a
                      href={getExplorerUrl(txSuccess.txHash, 'tx')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px] underline mt-0.5 truncate"
                    >
                      {shortenAddress(txSuccess.txHash)}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
