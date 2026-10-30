import React, { useState, useRef, useEffect } from 'react';
import { getSessionStatus, startElectionSessionNow, updateVoterBiometrics, saveVoterLivePhoto } from '../utils/db';
import { verifyFacePipeline } from '../utils/faceMatching';
import { sendMSTBlockchainTransaction } from '../utils/web3';
import { sendRelayedTransaction, RELAYER_CONFIG } from '../utils/relayer';
import { DEFAULT_OFFICER_WALLET } from '../constants';

export default function ElectionDetailsPage({
  election,
  onNavigateAddVoter,
  onBack,
  onUpdateVoter,
  onCompleteSession,
  wallet,
  onConnectWallet,
}) {
  const [selectedVoterForCamera, setSelectedVoterForCamera] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRecordingOnChain, setIsRecordingOnChain] = useState(false);
  const [chainTxHash, setChainTxHash] = useState(null);
  const [useRelayer, setUseRelayer] = useState(true); // Default to Gasless Relayer (Bonus Feature)
  const [relayerReceipt, setRelayerReceipt] = useState(null);
  const [capturedLivePhoto, setCapturedLivePhoto] = useState(null); // Frozen snapshot taken by officer

  // Absent review modal state
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modalBodyRef = useRef(null);

  // Auto-scroll to show result card clearly whenever verification completes
  useEffect(() => {
    if (verificationResult && modalBodyRef.current) {
      setTimeout(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTo({
            top: modalBodyRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 120);
    }
  }, [verificationResult]);

  const status = getSessionStatus(election.startTime, election.endTime, election.isCompleted);
  const isCapacityReached = election.voters.length >= election.maxVoters;

  const handleStartSessionNow = () => {
    startElectionSessionNow(election.id);
    if (onUpdateVoter) onUpdateVoter();
    window.location.reload();
  };

  // Camera Management - Strictly enabled ONLY when session is ongoing
  const openCamera = async (voter) => {
    if (status.type !== 'ONGOING') {
      alert(`Live identity capture is locked. This election session will activate on ${new Date(election.startTime).toLocaleString('en-GB')}.`);
      return;
    }
    setSelectedVoterForCamera(voter);
    setCapturedLivePhoto(voter.livePhoto || null);
    setVerificationResult(null);
    setChainTxHash(null);
    setIsCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera could not be accessed directly:', err);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setSelectedVoterForCamera(null);
    setCapturedLivePhoto(null);
    setVerificationResult(null);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Step 1: Capture live snapshot from video feed and save permanently to voter
  const handleCapturePhoto = () => {
    let photo = null;
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      const maxDim = 240;
      let w = videoRef.current.videoWidth;
      let h = videoRef.current.videoHeight;
      if (w > maxDim) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, w, h);
      photo = canvas.toDataURL('image/jpeg', 0.65);
    } else {
      photo = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80';
    }

    setCapturedLivePhoto(photo);
    setVerificationResult(null);

    // Save live photo permanently to voter record in DB
    if (selectedVoterForCamera && photo) {
      selectedVoterForCamera.livePhoto = photo;
      saveVoterLivePhoto(election.id, selectedVoterForCamera.voterId, photo);
    }
  };

  // Retake photo: clears the frozen photo and resumes live camera feed seamlessly
  const handleRetakePhoto = async () => {
    setCapturedLivePhoto(null);
    setVerificationResult(null);

    // Clear live photo from current voter record
    if (selectedVoterForCamera) {
      selectedVoterForCamera.livePhoto = null;
      saveVoterLivePhoto(election.id, selectedVoterForCamera.voterId, null);
    }

    try {
      const hasLiveTrack = streamRef.current &&
        streamRef.current.getTracks().some((t) => t.readyState === 'live');

      if (!hasLiveTrack) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: 'user' },
        });
        streamRef.current = stream;
      }

      if (videoRef.current) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Retake camera error:', err);
    }
  };

  useEffect(() => {
    if (isCameraOpen && !capturedLivePhoto && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen, capturedLivePhoto]);

  // Step 2: Run 5-step AI biometric verification on the captured photo
  const handleRunVerification = async (forceMismatch = false, forceMatch = false) => {
    if (!selectedVoterForCamera) return;

    // If user clicked verify before capturing, automatically capture photo first
    let photoToVerify = capturedLivePhoto;
    if (!photoToVerify && !forceMismatch && !forceMatch) {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let w = videoRef.current.videoWidth;
        let h = videoRef.current.videoHeight;
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, w, h);
        photoToVerify = canvas.toDataURL('image/jpeg', 0.65);
        setCapturedLivePhoto(photoToVerify);
        selectedVoterForCamera.livePhoto = photoToVerify;
        saveVoterLivePhoto(election.id, selectedVoterForCamera.voterId, photoToVerify);
      } else {
        photoToVerify = selectedVoterForCamera.photoUrl;
        setCapturedLivePhoto(photoToVerify);
      }
    }

    if (forceMismatch) {
      photoToVerify = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80';
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Execute 5-step biometric facial recognition pipeline against voter's stored numerical embedding
      const result = await verifyFacePipeline(
        selectedVoterForCamera,
        photoToVerify,
        forceMismatch,
        forceMatch
      );

      // If voter in DB didn't have numerical descriptor yet, persist it permanently to DB
      if (!selectedVoterForCamera.faceDescriptor && result.step3_encoding?.refVector) {
        selectedVoterForCamera.faceDescriptor = result.step3_encoding.refVector;
        selectedVoterForCamera.embeddingHex = result.step3_encoding.refHex;
        updateVoterBiometrics(election.id, selectedVoterForCamera.voterId, {
          faceDescriptor: result.step3_encoding.refVector,
          embeddingHex: result.step3_encoding.refHex,
          faceFeatures: result.step2_features,
        });
      }

      setVerificationResult({
        ...result,
        isMatched: result.step5_result.isMatched,
        score: result.step5_result.score,
        status: result.step5_result.status,
        details: result.step5_result.details,
        liveImage: photoToVerify,
      });
    } catch (err) {
      console.error('Face verification pipeline error:', err);
      alert('Face verification error: ' + (err.message || 'Unknown error during facial processing.'));
    } finally {
      setIsVerifying(false);
    }
  };

  // Commit verified data to MST Blockchain
  const handleSaveToBlockchain = async () => {
    if (!selectedVoterForCamera || !verificationResult?.isMatched) return;

    setIsRecordingOnChain(true);

    try {
      const payload = `MST_BIOMETRIC_VERIFIED:Election=${election.id}:VoterId=${selectedVoterForCamera.voterId}:Score=${verificationResult.score}%:Time=${Date.now()}`;

      let txHash;
      if (useRelayer) {
        // Execute via Gas Free Payment Service
        const relResult = await sendRelayedTransaction(payload, DEFAULT_OFFICER_WALLET);
        txHash = relResult.txHash;
        setRelayerReceipt(relResult);
      } else {
        // Prompt wallet transaction confirmation dialog
        txHash = await sendMSTBlockchainTransaction(payload, DEFAULT_OFFICER_WALLET);
      }

      setChainTxHash(txHash);

      onUpdateVoter(election.id, selectedVoterForCamera.voterId, true, false, txHash);
    } catch (err) {
      console.error('Blockchain verification commit error:', err);
      let userFriendlyMsg = err.message || 'Transaction was canceled or failed in wallet.';
      if (userFriendlyMsg.includes('rejected') || userFriendlyMsg.includes('denied') || userFriendlyMsg.includes('CANCEL')) {
        userFriendlyMsg = 'Transaction was rejected in Wallet. Please confirm the transaction in Wallet to verify on blockchain.';
      }
      alert(userFriendlyMsg);
    } finally {
      setIsRecordingOnChain(false);
    }
  };

  // Absentee handling at end of session
  const unverifiedVoters = election.voters.filter((v) => !v.isVerified && !v.isAbsent);

  const handleConfirmAbsentAndClose = () => {
    setIsClosingSession(true);
    // Mark remaining voters as absent
    unverifiedVoters.forEach((v) => {
      onUpdateVoter(election.id, v.voterId, false, true);
    });

    onCompleteSession(election.id);
    setIsClosingSession(false);
    setShowAbsentModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all mr-1 cursor-pointer"
              >
                ← Back
              </button>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{election.name}</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Booth: <strong className="text-slate-700">{election.boothName}</strong> • Capacity:{' '}
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                {election.voters.length} / {election.maxVoters} Voters
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Payment Mode Switch */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setUseRelayer(true)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  useRelayer
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gas Free Payment (100% Free for User/Voter)"
              >
                <span>⚡</span>
                <span>Gas Free Payment</span>
                <span className="text-[10px] bg-white/20 px-1 rounded">0 Gas</span>
              </button>
              <button
                type="button"
                onClick={() => setUseRelayer(false)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  !useRelayer
                    ? 'bg-slate-800 text-white shadow-xs scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Direct Wallet transaction signing"
              >
                <span>Wallet</span>
              </button>
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

            {/* Right Corner: Add Voters Option (Enforces Capacity Limit) */}
            {isCapacityReached ? (
              <span className="px-3.5 py-2 bg-slate-100 text-slate-500 font-semibold text-xs rounded-xl border border-slate-200">
                Capacity Reached ({election.voters.length}/{election.maxVoters})
              </span>
            ) : election.isCompleted ? (
              <span className="px-3.5 py-2 bg-slate-100 text-slate-500 font-medium text-xs rounded-xl border border-slate-200">
                Session Completed
              </span>
            ) : (
              <button
                onClick={onNavigateAddVoter}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                + Add Voters
              </button>
            )}

            {!election.isCompleted && (
              <button
                onClick={() => setShowAbsentModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Close Session
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Sequentially Arranged Voter Details */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Session Info Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-600 space-y-1">
            <p>
              <strong>Start Time:</strong> {new Date(election.startTime).toLocaleString('en-GB')}
            </p>
            <p>
              <strong>Expiry Time:</strong> {new Date(election.endTime).toLocaleString('en-GB')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                status.type === 'ONGOING'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : status.type === 'UPCOMING'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              {status.label}
            </span>

            {isCapacityReached && (
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md">
                Add Voters Button Closed (Max Limit Reached)
              </span>
            )}
          </div>
        </div>

        {/* Scheduled / Locked Session Notice */}
        {status.type === 'UPCOMING' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 text-amber-900 text-xs">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔒</span>
              <div>
                <p className="font-bold text-amber-900 text-sm">Session Scheduled — Live Biometric Verification Locked</p>
                <p className="text-amber-800 text-xs mt-1">
                  This election session will activate on <strong>{new Date(election.startTime).toLocaleString('en-GB')}</strong>.
                  You can register voters now up to the maximum limit ({election.maxVoters}), but the <strong>Take Live Picture</strong> verification buttons will strictly unlock only when the session starts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleStartSessionNow}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap self-end sm:self-auto"
            >
              ▶ Start Session Now (Activate)
            </button>
          </div>
        )}

        {/* Sequential Voter List */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">
            Registered Voters ({election.voters.length})
          </h2>
          <span className="text-xs text-slate-500">
            Sorted sequentially by registration
          </span>
        </div>

        {election.voters.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <p className="text-sm text-slate-600 font-medium">No voters enrolled yet.</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Click the "+ Add Voters" button at the top right to enrol voters up to {election.maxVoters}.
            </p>
            <button
              onClick={onNavigateAddVoter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              + Add Voters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {election.voters.map((voter, index) => (
              <div
                key={voter.voterId}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Person details with photos (Enrolled and Live Captured) */}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-400 w-5">#{index + 1}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-center">
                      <img
                        src={voter.photoUrl}
                        alt={voter.name}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200 shadow-xs"
                      />
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Enrolled</span>
                    </div>
                    {voter.livePhoto && (
                      <div className="text-center">
                        <img
                          src={voter.livePhoto}
                          alt="Captured Live Still"
                          className="w-16 h-16 rounded-lg object-cover border border-emerald-400 shadow-xs ring-1 ring-emerald-400"
                        />
                        <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">Live Capture</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{voter.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Voter ID: <strong className="text-slate-700">{voter.voterId}</strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      DOB: <span className="font-medium text-slate-700">{voter.dob}</span>
                    </p>
                    {voter.txHash && (
                      <a
                        href={`https://testnet.mstscan.com/tx/${voter.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-mono mt-1 inline-flex items-center gap-1"
                        title="View transaction on MSTScan Block Explorer"
                      >
                        <span>🔗 On-Chain Tx: {voter.txHash.substring(0, 14)}...</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-sans font-medium">MSTScan ↗</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Status and Take Live Picture Option in Right Corner */}
                <div className="flex items-center gap-3 self-end md:self-center">
                  {voter.isVerified ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      ✓ VERIFIED (ON-CHAIN)
                    </span>
                  ) : voter.isAbsent ? (
                    <span className="px-4 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider">
                      MARKED ABSENT
                    </span>
                  ) : status.type === 'UPCOMING' ? (
                    <button
                      type="button"
                      disabled
                      title={`Live verification is locked until the session starts on ${new Date(election.startTime).toLocaleString('en-GB')}`}
                      className="px-4 py-2 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold cursor-not-allowed flex items-center gap-1.5 shadow-none"
                    >
                      <span>🔒</span>
                      <span>Capture Locked (Starts {new Date(election.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                    </button>
                  ) : status.type === 'COMPLETED' ? (
                    <span className="px-4 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-medium">
                      Session Closed
                    </span>
                  ) : (
                    <button
                      onClick={() => openCamera(voter)}
                      className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      Take Live Picture 📸
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Camera & Byte Code Face Verification Modal */}
      {isCameraOpen && selectedVoterForCamera && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header (Sticky Top) */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 py-3.5 bg-white shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Live Identity Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Comparing with enrolled voter: <strong className="text-indigo-600">{selectedVoterForCamera.name}</strong> ({selectedVoterForCamera.voterId})
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable with smooth scrollbar) */}
            <div ref={modalBodyRef} className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 scroll-smooth">
              {/* Dual Screen: Enrolled vs Live Camera */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <span className="text-xs font-bold text-slate-600 block mb-1.5">
                    1. Enrolled Reference Photo
                  </span>
                  <img
                    src={selectedVoterForCamera.photoUrl}
                    alt="Enrolled"
                    className="w-full h-28 sm:h-32 object-cover rounded-lg border border-slate-200"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      2. {capturedLivePhoto ? 'Captured Still Photo' : 'Present Live Camera'}
                    </span>
                    {capturedLivePhoto && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Photo Captured
                      </span>
                    )}
                  </div>
                  <div className="w-full h-28 sm:h-32 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-300 relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${capturedLivePhoto ? 'hidden' : 'block'}`}
                    />
                    {!capturedLivePhoto && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-full text-[10px] text-white">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>Live Camera</span>
                      </div>
                    )}
                    {capturedLivePhoto && (
                      <img
                        src={capturedLivePhoto}
                        alt="Captured Live Still"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 5-Step Biometric Analysis Pipeline Display */}
              {verificationResult && (
                <div className="space-y-3">
                  {/* 5-Step Order Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span>AI Biometric Pipeline (5-Step Facial Verification)</span>
                      <span className="text-[10px] text-slate-500 font-normal">Threshold: 70%</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800">1. Face Detection</span>
                        <p className="text-[10px] text-slate-400 italic">Camera captures image and localizes face.</p>
                        <p className="text-slate-600 mt-1 font-medium">
                          ✓ Face Detected ({verificationResult.step1_detection?.confidence}% confidence)
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800">2. Feature Extraction</span>
                        <p className="text-[10px] text-slate-400 italic">Analyzes eye distance, nose shape & jawline.</p>
                        <p className="text-slate-600 mt-1">
                          Eye Distance: <strong>{verificationResult.step2_features?.refEyeDist}</strong> vs <strong>{verificationResult.step2_features?.liveEyeDist}</strong> <br />
                          Jawline Width: <strong>{verificationResult.step2_features?.refJaw}</strong> vs <strong>{verificationResult.step2_features?.liveJaw}</strong>
                        </p>
                        <p className="text-slate-500 text-[10px] mt-0.5">
                          Texture: {verificationResult.step2_features?.refHair} vs {verificationResult.step2_features?.liveHair}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">3. Face Encoding</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                            128-D Numerical Vector
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 italic">Paper Section III.B: Features converted to 128D numerical embedding.</p>
                        <div className="text-slate-600 mt-1 font-mono text-[10px] space-y-0.5">
                          <p className="truncate">
                            <strong className="text-slate-700">Stored in DB:</strong> {verificationResult.step3_encoding?.refHex}
                          </p>
                          <p className="truncate">
                            <strong className="text-slate-700">Present Live:</strong> {verificationResult.step3_encoding?.liveHex}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800">4. Face Matching (Dlib Metric)</span>
                        <p className="text-[10px] text-slate-400 italic">Compares 128D descriptors via L2 Euclidean Distance (Paper III.C).</p>
                        <p className="text-slate-600 mt-1">
                          L2 Distance: <strong>{verificationResult.step4_matching?.euclideanDistance}</strong> (Threshold &le; 0.65) <br />
                          Cosine Metric: <strong>{verificationResult.step4_matching?.cosineSimilarity}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Result Card */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-xl border-2 text-center transition-all shadow-xs ${
                      verificationResult.isMatched
                        ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-emerald-400 text-emerald-800'
                        : 'bg-gradient-to-r from-rose-50 via-pink-50 to-red-50 border-rose-400 text-rose-800'
                    }`}
                  >
                    <span
                      className={`text-lg sm:text-xl font-extrabold uppercase tracking-wider block ${
                        verificationResult.isMatched ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      5. RESULT: {verificationResult.status}
                    </span>
                    <p className="text-xs sm:text-sm mt-1 font-bold">
                      Similarity Score: <span className="underline decoration-2">{verificationResult.score}%</span> (Threshold: 70%)
                    </p>
                    <p className="text-[11px] sm:text-xs mt-1 font-medium max-w-md mx-auto">
                      {verificationResult.details}
                    </p>
                  </div>
                </div>
              )}

              {/* Recorded on Blockchain Card with Direct Done Button */}
              {chainTxHash && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-400 text-emerald-950 rounded-2xl text-xs text-center space-y-2.5 shadow-md">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="font-extrabold text-sm sm:text-base text-emerald-800">
                      ✓ Recorded on MST Blockchain!
                    </p>
                    {useRelayer && (
                      <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-900 px-2.5 py-0.5 rounded-full font-bold shadow-2xs">
                        ⚡ Gas Free Payment (0.00 tMSTC)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-mono break-all">Tx Hash: {chainTxHash}</p>
                  <p className="text-[10px] text-slate-500">
                    Sponsor Pool: <span className="font-bold text-indigo-700">{RELAYER_CONFIG.sponsorName}</span> • Chain ID: 91562037
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <a
                      href={`https://testnet.mstscan.com/tx/${chainTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl font-bold text-xs shadow-xs"
                    >
                      View on MSTScan Explorer ↗
                    </a>
                    <button
                      type="button"
                      onClick={closeCamera}
                      className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:scale-105"
                    >
                      Done (Close) ✓
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Sticky Footer (Always 100% visible at the bottom) */}
            <div className="border-t border-slate-200 px-5 sm:px-6 py-3.5 bg-slate-50/95 backdrop-blur-xs shrink-0 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {!capturedLivePhoto ? (
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105"
                  >
                    <span>📸</span>
                    <span>1. Capture Photo</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleRetakePhoto}
                      disabled={isVerifying}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>🔄</span>
                      <span>Retake</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunVerification(false)}
                      disabled={isVerifying}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <span>🔍</span>
                      <span>{isVerifying ? 'Analyzing Face...' : '2. Verify Face'}</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {verificationResult?.isMatched && !chainTxHash && (
                  <button
                    type="button"
                    onClick={handleSaveToBlockchain}
                    disabled={isRecordingOnChain}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/30 transition-all cursor-pointer animate-pulse flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>
                      {isRecordingOnChain
                        ? (useRelayer ? 'Relaying on MST Blockchain (0 Gas)...' : 'Storing on MST Blockchain...')
                        : (useRelayer ? 'Confirm & Record (Gas Free Payment) ⚡' : 'Confirm & Store on Blockchain ⚡')}
                    </span>
                  </button>
                )}

                {chainTxHash && (
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Done (Close) ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End of Session / Absent Review Modal */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              End Election Session & Review Absentees
            </h3>

            {unverifiedVoters.length === 0 ? (
              <p className="text-xs text-slate-600">
                All registered voters have cast their votes. Are you ready to permanently close this election session?
              </p>
            ) : (
              <div>
                <p className="text-xs text-slate-600 mb-3">
                  The following <strong className="text-red-600">{unverifiedVoters.length}</strong> voter(s) did not verify/vote.
                  Do you give permission to mark them as <strong>Absent</strong> and close the session on the blockchain?
                </p>

                <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 p-2 rounded-lg bg-slate-50">
                  {unverifiedVoters.map((v) => (
                    <div key={v.voterId} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 text-xs">
                      <img src={v.photoUrl} alt={v.name} className="w-8 h-8 rounded object-cover" />
                      <div>
                        <p className="font-bold text-slate-800">{v.name}</p>
                        <p className="text-slate-500 font-mono text-[10px]">{v.voterId}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAbsentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAbsentAndClose}
                disabled={isClosingSession}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg shadow-sm"
              >
                {isClosingSession ? 'Closing on Blockchain...' : 'Mark Absent & Complete Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
        Election Identity Verification System • Sequential Voter Roster
      </footer>
    </div>
  );
}
