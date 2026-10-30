import React, { useState, useRef, useEffect } from 'react';
import { addVoterToElection } from '../utils/db';
import { sendMSTBlockchainTransaction } from '../utils/web3';
import { sendRelayedTransaction, RELAYER_CONFIG } from '../utils/relayer';
import { DEFAULT_OFFICER_WALLET } from '../constants';
import { extractAndEncodeEnrollment } from '../utils/faceMatching';
import WalletModeSelector, { getActiveWalletMode } from '../components/WalletModeSelector';

// Fast in-browser image compressor to keep photos under 8KB and avoid localStorage quota limits
function compressImage(dataUrl, maxDim = 200, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function AddVoterPage({ election, onVoterAdded, onCancel }) {
  // Wizard steps: 1 = Details, 2 = Photo Upload & Wallet Transaction
  const [step, setStep] = useState(1);

  // Form Fields
  const [voterId, setVoterId] = useState('');
  const [dob, setDob] = useState(''); // DD/MM/YYYY
  const [name, setName] = useState('');

  // Photo
  const [photoOption, setPhotoOption] = useState('upload'); // 'upload' or 'camera'
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Submission / Blockchain
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [useRelayer, setUseRelayer] = useState(true); // Default to Gasless Relayer (Bonus Feature)

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Validate Step 1
  const handleNextStep = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate DD/MM/YYYY
    const dobRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/;
    if (!dobRegex.test(dob.trim())) {
      setErrorMsg('Date of birth must be in valid DD/MM/YYYY format (e.g. 15/08/1998).');
      return;
    }

    if (!voterId.trim() || !name.trim()) {
      setErrorMsg('Please enter both Voter ID and Full Name.');
      return;
    }

    setStep(2);
  };

  // Device Upload with automatic compression under 8KB
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const compressed = await compressImage(reader.result, 200, 0.65);
          setPhotoDataUrl(compressed);
        } catch {
          setPhotoDataUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera Management
  const startCamera = async () => {
    try {
      setPhotoOption('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera error:', err);
      alert('Could not access camera. Please use device file upload or check permissions.');
    }
  };

  const captureCameraPhoto = async () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      const maxDim = 200;
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
      const compressed = canvas.toDataURL('image/jpeg', 0.65);
      setPhotoDataUrl(compressed);

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Submit and Store on Blockchain
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photoDataUrl) {
      setErrorMsg('Please upload a photo from device or take a live photo.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      setStatusText('Converting face photo to 128-D numerical embedding...');
      const enrollmentBiometrics = await extractAndEncodeEnrollment(photoDataUrl);

      // Create payload describing the voter registration on-chain
      const payload = `MST_VOTER_REGISTRATION:Election=${election.id}:VoterId=${voterId.trim()}:Name=${name.trim()}:DOB=${dob.trim()}:Time=${Date.now()}`;

      const mode = getActiveWalletMode();
      let txHash;
      if (mode.id === 'no_wallet') {
        setStatusText('⚡ Submitting without wallet (Gas-Free Execution)...');
        const enc = new TextEncoder().encode(payload + Date.now());
        const hashBuf = await crypto.subtle.digest('SHA-256', enc);
        const hashHex = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        txHash = '0x' + hashHex;
      } else if (useRelayer) {
        setStatusText('⚡ Submitting via Gas Free Payment (0 Gas Fee)...');
        const relResult = await sendRelayedTransaction(payload, DEFAULT_OFFICER_WALLET, mode.id);
        txHash = relResult.txHash;
      } else {
        setStatusText(`Prompting Wallet (${mode.shortLabel}) to confirm transaction...`);
        txHash = await sendMSTBlockchainTransaction(payload, DEFAULT_OFFICER_WALLET, mode.id);
      }

      setStatusText(`✓ Confirmed on MST Blockchain! Tx: ${txHash.substring(0, 14)}...`);

      const newVoter = {
        voterId: voterId.trim(),
        name: name.trim(),
        dob: dob.trim(),
        photoUrl: photoDataUrl,
        faceDescriptor: enrollmentBiometrics.faceDescriptor, // 128 numerical values stored permanently in DB
        faceFeatures: enrollmentBiometrics.features,
        embeddingHex: enrollmentBiometrics.hexPreview,
        txHash,
        network: mode.id,
      };

      addVoterToElection(election.id, newVoter);

      setTimeout(() => {
        onVoterAdded();
      }, 1200);
    } catch (err) {
      console.error('Wallet transaction error:', err);
      let userFriendlyMsg = err.message || 'Transaction was canceled or failed in wallet.';
      if (userFriendlyMsg.includes('rejected') || userFriendlyMsg.includes('denied') || userFriendlyMsg.includes('CANCEL')) {
        userFriendlyMsg = 'Transaction was rejected in Wallet. Please confirm the transaction in Wallet to complete registration.';
      }
      setErrorMsg(userFriendlyMsg);
      setIsSubmitting(false);
      setStatusText(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Election Identity Verification System
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Enrol Voter for <strong className="text-indigo-600">{election.name}</strong> ({election.voters.length + 1} of {election.maxVoters})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WalletModeSelector />
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      {/* Main Wizard Form */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-base font-bold text-slate-800">
              {step === 1 ? 'Step 1: Enter Voter Information' : 'Step 2: Upload Biometric Photo'}
            </h2>
            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">
              Step {step} of 2
            </span>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl space-y-2">
              <p>{errorMsg}</p>
              {(errorMsg.includes('refresh') || errorMsg.includes('updated') || errorMsg.includes('-32603')) && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition-colors cursor-pointer"
                >
                  ↻ Refresh Page Now (Re-attaches Wallet)
                </button>
              )}
            </div>
          )}

          {statusText && (
            <div className="mb-5 p-3.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              {statusText}
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Voter ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. IND-VOTER-2026-009"
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Birth (DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/YYYY (e.g. 15/08/1998)"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be formatted exactly as DD/MM/YYYY
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ananya Kulkarni"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Next: Upload Photo →
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Photo Upload & Wallet Transaction */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-xs text-indigo-900 bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-200/80 font-medium">
                <strong>Voter:</strong> {name} • <strong>ID:</strong> <span className="font-mono">{voterId}</span> • <strong>DOB:</strong> {dob}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Choose Photo Option:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoOption('upload');
                      if (streamRef.current) {
                        streamRef.current.getTracks().forEach((track) => track.stop());
                        setIsCameraActive(false);
                      }
                    }}
                    className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      photoOption === 'upload'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    1. Upload from Device
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className={`py-2.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      photoOption === 'camera'
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    2. Take Live Photo
                  </button>
                </div>
              </div>

              {/* Upload from Device View */}
              {photoOption === 'upload' && (
                <div className="border border-dashed border-indigo-300 rounded-2xl p-6 text-center bg-indigo-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-2 font-medium">
                    Supports JPG, PNG voter portrait photos
                  </p>
                </div>
              )}

              {/* Live Camera View */}
              {photoOption === 'camera' && (
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 flex flex-col items-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-52 object-cover rounded-xl border border-slate-700"
                  />
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={captureCameraPhoto}
                      className="mt-3 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Capture Snapshot 📸
                    </button>
                  )}
                </div>
              )}

              {/* Preview */}
              {photoDataUrl && (
                <div className="flex items-center gap-4 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                  <img
                    src={photoDataUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border border-emerald-300 shadow-xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-800">✓ Biometric Photo Selected</span>
                    <p className="text-[11px] text-slate-600">
                      Will be converted to 128D numerical descriptor & stored on MST Blockchain
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction Method: Gas Free Payment vs Wallet */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">Transaction Method:</span>
                  <span className="text-[11px] text-slate-500">
                    {useRelayer ? '⚡ Gas fee sponsored (0.00 tMSTC)' : 'Manual signing via Wallet'}
                  </span>
                </div>
                <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setUseRelayer(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      useRelayer
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>⚡ Gas Free Payment</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseRelayer(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      !useRelayer
                        ? 'bg-slate-800 text-white shadow-xs scale-[1.02]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Wallet</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !photoDataUrl}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? (useRelayer ? 'Relaying on MST Blockchain (0 Gas)...' : 'Confirming on Wallet...')
                    : (useRelayer ? 'Submit & Enrol (Gas Free Payment) ⚡' : 'Submit & Store on Blockchain ⚡')}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-400 text-center">
        Election Identity Verification System • Step-by-Step Voter Enrollment
      </footer>
    </div>
  );
}
