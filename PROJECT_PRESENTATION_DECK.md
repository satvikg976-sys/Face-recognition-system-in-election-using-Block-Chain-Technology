# 🗳️ MST VoteGuard — Project Presentation & Demo Day Slide Deck
**Event:** MST Blockchain Buildathon 2.0 (Round 2 & Round 3 Finals)  
**Venue:** Masterstroke Technosoft Pvt. Ltd. (MST Blockchain), Kohinoor World Tower, Pimpri, Pune  

---

## 📊 Slide Structure (8-10 Slides for Judges)

### Slide 1: Title & Team Info
* **Project Name:** MST VoteGuard
* **Tagline:** Privacy-Preserving Facial Biometric Voter Verification with Tamper-Evident MST Blockchain Audit Trail
* **Track:** MST Blockchain Buildathon 2.0 — MVP Sprint
* **Team Members & Roles:** [Add names & roles]
* **Target Network:** MST Testnet (Chain ID: `91562037`) ➡️ MST Mainnet (Chain ID: `4646`)

---

### Slide 2: Problem Statement
* **Current Electoral Identity Check Challenges:**
  * **Manual Fatigue & Errors:** Booth officers manually comparing physical ID cards against printed voter lists.
  * **Vulnerability to Impersonation & Bogus Voting:** Fake IDs and duplicate registrations across wards.
  * **Opaque Verification Logs:** Paper logs or centralized databases can be modified retroactively without detection.
  * **Lack of Trust in Centralized Tech:** Storing sensitive citizen biometrics on public ledgers violates privacy laws and creates single points of failure.

---

### Slide 3: Proposed Solution — MST VoteGuard
* **Biometric Verification at Polling Desk:** Instant webcam capture matched against approved electoral roll reference photos.
* **Zero-PII On-Chain Architecture:** No names, Aadhaar/EPIC numbers, or photos ever touch the blockchain. Only cryptographic `keccak256` salted hashes are anchored.
* **BridgeKey Non-Custodial Wallet Integration:** Officers must cryptographically sign every verification event using BridgeKey, ensuring strict non-repudiation.
* **Double-Vote Immunity:** The smart contract automatically detects and reverts any duplicate verification attempt for the same citizen within the same session.
* **Public Verifiability:** Anyone can audit the cryptographic integrity of any booth on MSTScan.

---

### Slide 4: System Architecture & Data Flow
* **Off-Chain Layer:**
  * High-resolution face capture via WebRTC.
  * Structural biometric distance matching.
  * Local salt generation: $\text{Hash} = \text{keccak256}(\text{VoterID} \parallel \text{Ward} \parallel \text{Salt})$.
* **On-Chain Layer (MST Blockchain):**
  * `ElectionAudit.sol` deployed on MST Testnet (Chain ID: 91562037).
  * Session registry (`createSession`).
  * Officer access control (`authorizeOfficer`).
  * Immutable verification event commits (`recordVerification`).
  * Double-vote checks (`hasVotedInSession`).

---

### Slide 5: Core Features & Working Prototype
* **Admin Console:** Open booth sessions, set operating hours, authorize officer wallet addresses, and pre-enrol voter rolls.
* **Polling Booth Operator View:** Instant lookup, dual-screen comparison (Enrolled Photo vs Live Desk Camera), biometric confidence scoring.
* **Double-Voting Prevention Alert:** Immediate smart contract revert if duplicate vote is attempted.
* **Manual Review Fallback:** Mismatches routed to the presiding officer without automatic disenfranchisement.
* **Public Audit Explorer:** Searchable on-chain proof engine directly linked to MSTScan.

---

### Slide 6: Meaningful MST Blockchain Usage (Hackathon Criteria)
* **Why Blockchain? Why MST?**
  * Fast block times and high throughput on MST Blockchain enable instant desk clearance without queue delays.
  * Native BridgeKey wallet provides secure, non-custodial officer authentication.
  * True immutability: Verifications cannot be backdated or deleted by election staff or malicious actors.

---

### Slide 7: Live Deployment & Verifiable On-Chain Proof
* **Smart Contract Address:** `[Deployed Address on MST Testnet]`
* **Explorer Link:** `https://testnet.mstscan.com/address/...`
* **Sample Transaction Hashes:**
  * Session Creation Tx: `0x...`
  * Verified Voter Tx: `0x...`
* **Live Application URL:** `[Your Vercel/Netlify URL]`
* **GitHub Repository:** `[Your Public GitHub URL]`

---

### Slide 8: Future Roadmap & Production Scaling
* **Phase 1 (Post-Hackathon):** Zero-Knowledge Proofs (zk-SNARKs) for anonymous voter eligibility proofs.
* **Phase 2:** Multi-booth mesh synchronization on MST Mainnet with offline fallback queueing.
* **Phase 3:** Hardware integration with Election Commission EVMs and official VVPAT modules.

---

### Slide 9: Q&A / Live Demonstration
* Live demo with BridgeKey Wallet on MST Testnet.
* Live face capture, transaction broadcast, and verification on MSTScan.
