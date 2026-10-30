import React, { useState, useEffect } from 'react';
import AuthPage from './views/AuthPage';
import DashboardPage from './views/DashboardPage';
import CreateElectionPage from './views/CreateElectionPage';
import ElectionDetailsPage from './views/ElectionDetailsPage';
import AddVoterPage from './views/AddVoterPage';
import {
  initDB,
  getCurrentOfficer,
  logoutOfficer,
  getElections,
  updateVoterStatus,
  completeElectionSession,
} from './utils/db';
import { connectWallet } from './utils/web3';

export default function App() {
  const [officer, setOfficer] = useState(null);
  const [currentView, setCurrentView] = useState('auth'); // 'auth' | 'dashboard' | 'create_election' | 'election_details' | 'add_voter'
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [wallet, setWallet] = useState(null);

  // Initialize DB and session
  useEffect(() => {
    initDB();
    const storedOfficer = getCurrentOfficer();
    if (storedOfficer) {
      setOfficer(storedOfficer);
      setCurrentView('dashboard');
    }
    setElections(getElections());
  }, []);

  // Reload elections from storage
  const refreshElections = () => {
    setElections(getElections());
  };

  // Auth handlers
  const handleLoginSuccess = (loggedOfficer) => {
    setOfficer(loggedOfficer);
    refreshElections();
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    logoutOfficer();
    setOfficer(null);
    setCurrentView('auth');
  };

  // Connect Web3 Wallet
  const handleConnectWallet = async () => {
    try {
      const data = await connectWallet();
      setWallet(data);
    } catch (err) {
      console.warn('Wallet connection notification:', err.message);
    }
  };

  // Selected Election
  const selectedElection = elections.find((e) => e.id === selectedElectionId);

  // Navigation handlers
  const handleSelectElection = (election) => {
    setSelectedElectionId(election.id);
    setCurrentView('election_details');
  };

  const handleElectionCreated = (newElection) => {
    refreshElections();
    setCurrentView('dashboard');
  };

  const handleVoterAdded = () => {
    refreshElections();
    setCurrentView('election_details');
  };

  const handleUpdateVoter = (electionId, voterId, isVerified, isAbsent, txHash) => {
    updateVoterStatus(electionId, voterId, isVerified, isAbsent, txHash);
    refreshElections();
  };

  const handleCompleteSession = (electionId) => {
    completeElectionSession(electionId);
    refreshElections();
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white">
      {currentView === 'auth' && (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}

      {currentView === 'dashboard' && (
        <DashboardPage
          officer={officer}
          elections={elections}
          onNavigateCreate={() => setCurrentView('create_election')}
          onSelectElection={handleSelectElection}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'create_election' && (
        <CreateElectionPage
          officer={officer}
          onElectionCreated={handleElectionCreated}
          onCancel={() => setCurrentView('dashboard')}
        />
      )}

      {currentView === 'election_details' && selectedElection && (
        <ElectionDetailsPage
          election={selectedElection}
          onNavigateAddVoter={() => setCurrentView('add_voter')}
          onBack={() => setCurrentView('dashboard')}
          onUpdateVoter={handleUpdateVoter}
          onCompleteSession={handleCompleteSession}
          wallet={wallet}
          onConnectWallet={handleConnectWallet}
        />
      )}

      {currentView === 'add_voter' && selectedElection && (
        <AddVoterPage
          election={selectedElection}
          onVoterAdded={handleVoterAdded}
          onCancel={() => setCurrentView('election_details')}
        />
      )}
    </div>
  );
}
