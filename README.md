# 🛡️ MST VoteGuard — Face Recognition System for Election Verification
### A Privacy-Preserving, Blockchain-Audited Voter Identity Verification Platform
**Built for MST Blockchain Buildathon 2.0 | Round 2: MVP Sprint**

---

## 📌 Executive Summary
During elections, polling officers face severe challenges in verifying voter identity quickly and accurately. Manual paper verification is slow, error-prone, vulnerable to unauthorized log alteration, and lacks transparent post-election auditing.

**MST VoteGuard** combines **biometric facial recognition** with the **MST Blockchain** to deliver:
1. **Instant Identity Verification:** Polling desk live face capture matched with enrolled voter reference photos.
2. **Zero-PII On-Chain Privacy:** No photos, names, or raw voter IDs ever touch the blockchain. Only cryptographic `keccak256` salted hashes and audit metadata are committed.
3. **Double-Voting Prevention:** Smart contract automatically detects and reverts duplicate verification attempts within the same session.
4. **Tamper-Evident Audit Trail:** Every verification event is signed by an authorized polling officer's **Wallet** and permanently anchored on MST Blockchain.
5. **Public Auditor Explorer:** Anyone can mathematically verify that booth records match the immutable on-chain state without compromising citizen privacy.

---

## ⚙️ MST Blockchain Network Details

### **MST Testnet (Current Deployment)**
* **Network Name:** MST Testnet
* **RPC URL:** `https://testnetrpc.mstblockchain.com`
* **Chain ID:** `91562037` (`0x5752945`)
* **Currency Symbol:** `tMSTC`
* **Block Explorer:** [testnet.mstscan.com](https://testnet.mstscan.com)
* **Official Faucet:** [coral-faucet.mstblockchain.com](https://coral-faucet.mstblockchain.com) | [faucet.masterstroke.academy](https://faucet.masterstroke.academy)

### **MST Mainnet (Production Ready)**
* **Network Name:** MST Mainnet
* **RPC URL:** `https://mariorpc.mstblockchain.com/`
* **Chain ID:** `4646` (`0x1226`)
* **Currency Symbol:** `MSTC`
* **Block Explorer:** [mstscan.com](https://mstscan.com)

---

## 🏗️ Architecture & Workflow

```
                        ┌────────────────────────────────────────┐
                        │      Authorized Presiding Officer      │
                        │    (BridgeKey Non-Custodial Wallet)    │
                        └───────────────────┬────────────────────┘
                                            │
                      ┌─────────────────────┴────────────────────┐
                      ▼                                          ▼
      ┌───────────────────────────────┐          ┌───────────────────────────────┐
      │     DApp Frontend (Web)       │          │    MST Blockchain Network     │
      │                               │          │     (Chain ID: 91562037)      │
      │  1. Live Webcam Snapshot      │          ├───────────────────────────────┤
      │  2. Biometric Feature Match   │ Commit   │  ElectionAudit.sol            │
      │  3. Salted Hash Generation    │─────────▶│  - createSession()            │
      │     keccak256(VoterID + Salt) │    Tx    │  - authorizeOfficer()         │
      │  4. Duplicate Check & Alert   │          │  - recordVerification()       │
      │  5. Officer Signature Request │          │  - verifyVoterAudit()         │
      └───────────────────────────────┘          └───────────────┬───────────────┘
                                                                 │
                                                                 ▼
                                                 ┌───────────────────────────────┐
                                                 │    MSTScan Block Explorer     │
                                                 │   (Public Verifiable Proof)   │
                                                 └───────────────────────────────┘
```

---

## 🔐 Privacy & Security Model
* **Off-Chain Storage:** All photos and voter identifying details (Aadhaar/EPIC numbers) are stored locally in secured voter registries.
* **Salted Cryptographic Hash:** Each voter record is hashed with a secret booth salt before interacting with the blockchain:
  $$\text{recordHash} = \text{keccak256}(\text{voterID} \parallel \text{ward} \parallel \text{salt})$$
* **Non-Repudiation:** Polling officers must connect their **BridgeKey Wallet** to sign every verification transaction.
* **Auditability:** Auditors can query `verifyVoterAudit(sessionId, recordHash)` to prove that a vote was verified at a specific booth, by a specific officer, at a verifiable block timestamp.

---

## 📜 Smart Contract Specification (`ElectionAudit.sol`)

The `ElectionAudit` smart contract implements:
* `createSession(city, area, ward, boothName, date, startTime, endTime)`: Configures and opens a polling session.
* `authorizeOfficer(sessionId, officerAddress)`: Authorizes a specific polling officer's wallet address.
* `recordVerification(sessionId, voterRecordHash, liveCaptureHash, status, confidence, remarks)`:
  - Validates officer authorization and active session status.
  - Checks `hasVotedInSession[sessionId][voterRecordHash]` to prevent duplicate voting.
  - Commits event metadata and emits `VerificationLogged` event for MSTScan indexing.
* `verifyVoterAudit(sessionId, voterRecordHash)`: Read-only query for public verification against the blockchain.

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js** (v18+)
* **BridgeKey Wallet Chrome Extension** ([bridgekey.io](https://bridgekey.io))

### 1. Smart Contract Setup & Tests
```bash
cd contracts
npm install

# Run unit tests (All passing)
npx hardhat test
```

### 2. Deploy to MST Testnet
```bash
# Claim tMSTC tokens to your deployer wallet from https://coral-faucet.mstblockchain.com/
# Set your PRIVATE_KEY in contracts/.env

npx hardhat run scripts/deploy.js --network mstTestnet
```

### 3. Run Frontend DApp
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser with the BridgeKey Wallet extension enabled.

---

## 🎥 2–3 Minute Demo Video Script

| Time | Scene | Talking Points |
| :--- | :--- | :--- |
| **0:00 - 0:30** | **Problem & Overview** | Introduce MST VoteGuard. Explain election identity challenges and how MST Blockchain provides a tamper-proof audit trail with zero PII leaks. |
| **0:30 - 1:00** | **BridgeKey Wallet & Session Setup** | Show BridgeKey extension connected on MST Testnet (Chain ID 91562037). Switch to Admin tab to show booth session configuration. |
| **1:00 - 1:45** | **Live Face Verification** | Open Polling Booth tab. Select voter, activate webcam, capture live face, show the 97% biometric match score, and explain the salted hash. |
| **1:45 - 2:15** | **MST Blockchain Commit & Double Vote Alert** | Click "Commit Audit to MST Blockchain". Approve the transaction in BridgeKey Wallet. Show the confirmed transaction hash and open it on **MSTScan**. Demonstrate trying to verify the same voter again to show the double-voting prevention revert. |
| **2:15 - 2:45** | **Public Audit Explorer & Conclusion** | Paste the voter hash in the Audit Explorer tab to prove instant on-chain verification. Conclude with real-world impact and readiness for MST Mainnet deployment. |

---

## 🏆 Buildathon Compliance Checklist
- [x] **MST Testnet Deployed Contract**
- [x] **Real, Verifiable MSTScan Transaction Proofs**
- [x] **BridgeKey Wallet Integration & Signing**
- [x] **Functional DApp with Live Webcam Biometric Verification**
- [x] **Public GitHub Repository with Full Source Code**
- [x] **Mainnet-Ready Architecture & Deployment Config**
- [x] **Comprehensive Documentation & Video Script**
