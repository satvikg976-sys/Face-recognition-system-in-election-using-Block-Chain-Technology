// Persistent storage helper for officers, elections, and voter rolls

const STORAGE_KEYS = {
  OFFICERS: 'mst_officers_db',
  CURRENT_USER: 'mst_current_officer',
  ELECTIONS: 'mst_elections_db',
};

// Initial default officers if empty
const DEFAULT_OFFICERS = [
  {
    boothName: 'Booth 403 Pimpri',
    officerName: 'Satvik',
    password: 'password123',
  },
];

// Initialize DB and ensure storage quota is healthy
export function initDB() {
  if (!localStorage.getItem(STORAGE_KEYS.OFFICERS)) {
    localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(DEFAULT_OFFICERS));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ELECTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Clean up older completed test sessions to keep storage light (< 150 KB)
      // Keep up to 4 sessions, and clean any bulky base64 from completed historical ones
      if (parsed.length > 4 || raw.length > 500000) {
        const cleaned = parsed.slice(0, 4).map((el, idx) => {
          if (idx > 1 && el.isCompleted && el.voters) {
            // Keep lightweight avatar placeholders for historical sessions
            return {
              ...el,
              voters: el.voters.map((v) => ({
                ...v,
                photoUrl: v.photoUrl && v.photoUrl.startsWith('data:') && v.photoUrl.length > 20000
                  ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60'
                  : v.photoUrl,
                livePhoto: undefined,
              })),
            };
          }
          return el;
        });
        localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(cleaned));
      }
    }
  } catch (e) {
    console.warn('DB quota check:', e);
  }
}

// Register officer
export function registerOfficer(boothName, officerName, password) {
  const officers = getOfficers();
  const exists = officers.some(
    (o) => o.boothName.toLowerCase() === boothName.trim().toLowerCase() &&
           o.officerName.toLowerCase() === officerName.trim().toLowerCase()
  );
  if (exists) {
    throw new Error('An officer with this Booth Name and Officer Name is already registered.');
  }

  const newOfficer = {
    boothName: boothName.trim(),
    officerName: officerName.trim(),
    password: password.trim(),
    registeredAt: new Date().toISOString(),
  };

  officers.push(newOfficer);
  localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(officers));
  return newOfficer;
}

// Login officer
export function loginOfficer(boothName, officerName, password) {
  const officers = getOfficers();
  const match = officers.find(
    (o) =>
      o.boothName.toLowerCase() === boothName.trim().toLowerCase() &&
      o.officerName.toLowerCase() === officerName.trim().toLowerCase() &&
      o.password === password.trim()
  );

  if (!match) {
    throw new Error('Invalid Booth Name, Officer Name, or Password. Please check your credentials.');
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(match));
  return match;
}

// Current logged in user
export function getCurrentOfficer() {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

export function logoutOfficer() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getOfficers() {
  const data = localStorage.getItem(STORAGE_KEYS.OFFICERS);
  return data ? JSON.parse(data) : DEFAULT_OFFICERS;
}

// Elections DB
export function getElections() {
  const data = localStorage.getItem(STORAGE_KEYS.ELECTIONS);
  if (!data) {
    // Initial sample election
    const initial = [
      {
        id: 'elec_1',
        name: 'General Municipal Election 2026',
        boothName: 'Booth 403 Pimpri',
        maxVoters: 5,
        startTime: new Date(Date.now() - 3600000).toISOString(), // Started 1h ago (Ongoing)
        endTime: new Date(Date.now() + 86400000).toISOString(),   // Ends tomorrow
        isCompleted: false,
        voters: [
          {
            voterId: 'IND-VOTER-001',
            name: 'Aarav Sharma',
            dob: '15/08/1996',
            photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
            isVerified: false,
            isAbsent: false,
            txHash: '0x3f9821...',
          },
          {
            voterId: 'IND-VOTER-002',
            name: 'Priya Patel',
            dob: '22/03/1998',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
            isVerified: false,
            isAbsent: false,
            txHash: '0x71ba42...',
          },
        ],
      },
    ];
    localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
}

export function saveElections(elections) {
  try {
    localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(elections));
  } catch (err) {
    console.warn('Storage quota exceeded, running smart safe compaction...', err);
    try {
      // 1. Keep top 4 sessions and replace large photos in older completed sessions
      const compacted = elections.slice(0, 4).map((el, idx) => {
        if (idx > 0 && el.isCompleted && el.voters) {
          return {
            ...el,
            voters: el.voters.map((v) => ({
              ...v,
              photoUrl: v.photoUrl && v.photoUrl.startsWith('data:') && v.photoUrl.length > 20000
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60'
                : v.photoUrl,
            })),
          };
        }
        return el;
      });
      localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(compacted));
    } catch (err2) {
      // 2. Emergency fallback: save only active sessions with no data corruption
      console.warn('Emergency fallback saving active sessions only:', err2);
      const activeOnly = elections.filter((e) => !e.isCompleted);
      const fallbackList = activeOnly.length > 0 ? activeOnly : elections.slice(0, 2);
      localStorage.setItem(STORAGE_KEYS.ELECTIONS, JSON.stringify(fallbackList));
    }
  }
}

export function saveVoterLivePhoto(electionId, voterId, livePhoto) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (!el) return;

  const voter = el.voters.find((v) => v.voterId === voterId);
  if (voter) {
    voter.livePhoto = livePhoto;
    saveElections(elections);
  }
  return el;
}

export function createElection(name, boothName, maxVoters, startTime, endTime) {
  const elections = getElections();
  const newElection = {
    id: 'elec_' + Date.now(),
    name: name.trim(),
    boothName: boothName.trim(),
    maxVoters: parseInt(maxVoters, 10),
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    isCompleted: false,
    voters: [],
  };
  elections.unshift(newElection);
  saveElections(elections);
  return newElection;
}

export function addVoterToElection(electionId, voterData) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (!el) throw new Error('Election not found');

  if (el.voters.length >= el.maxVoters) {
    throw new Error('Maximum voter limit reached! Extra voters are not allowed.');
  }

  const existing = el.voters.find((v) => v.voterId.toLowerCase() === voterData.voterId.toLowerCase());
  if (existing) {
    throw new Error('This Voter ID is already registered in this election.');
  }

  el.voters.push({
    ...voterData,
    isVerified: false,
    isAbsent: false,
  });

  saveElections(elections);
  return el;
}

export function updateVoterStatus(electionId, voterId, isVerified, isAbsent, txHash = null) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (!el) return;

  const voter = el.voters.find((v) => v.voterId === voterId);
  if (voter) {
    if (isVerified !== null) voter.isVerified = isVerified;
    if (isAbsent !== null) voter.isAbsent = isAbsent;
    if (txHash) voter.txHash = txHash;
    saveElections(elections);
  }
  return el;
}

export function updateVoterBiometrics(electionId, voterId, biometrics) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (!el) return;

  const voter = el.voters.find((v) => v.voterId === voterId);
  if (voter) {
    if (biometrics.faceDescriptor) voter.faceDescriptor = biometrics.faceDescriptor;
    if (biometrics.embeddingHex) voter.embeddingHex = biometrics.embeddingHex;
    if (biometrics.faceFeatures) voter.faceFeatures = biometrics.faceFeatures;
    saveElections(elections);
  }
  return el;
}

export function completeElectionSession(electionId) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (el) {
    el.isCompleted = true;
    saveElections(elections);
  }
  return el;
}

export function startElectionSessionNow(electionId) {
  const elections = getElections();
  const el = elections.find((e) => e.id === electionId);
  if (el) {
    el.startTime = new Date(Date.now() - 1000).toISOString();
    saveElections(elections);
  }
  return el;
}

// Determine session active status
export function getSessionStatus(startTime, endTime, isCompleted) {
  if (isCompleted) {
    return { type: 'COMPLETED', label: 'Completed' };
  }
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (now < start) {
    const formattedDate = start.toLocaleDateString('en-GB') + ' at ' + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { type: 'UPCOMING', label: `Will be active on ${formattedDate}` };
  }

  if (now >= start && now <= end) {
    return { type: 'ONGOING', label: 'On going session' };
  }

  return { type: 'COMPLETED', label: 'Completed' };
}
