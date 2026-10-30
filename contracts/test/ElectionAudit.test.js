const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ElectionAudit Smart Contract - Strict Voter Limits & Flow", function () {
  let electionAudit;
  let officer, voter1;

  beforeEach(async function () {
    [officer, voter1] = await ethers.getSigners();
    const ElectionAuditFactory = await ethers.getContractFactory("ElectionAudit");
    electionAudit = await ElectionAuditFactory.deploy();
    await electionAudit.waitForDeployment();
  });

  it("Should create an election with max voter capacity and time session", async function () {
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 3600;

    const tx = await electionAudit.createElection(
      "General Assembly 2026",
      "Booth 403 Pimpri",
      2, // Max 2 voters only
      startTime,
      endTime
    );
    await tx.wait();

    const elections = await electionAudit.getAllElections();
    expect(elections.length).to.equal(1);

    const el = await electionAudit.elections(elections[0]);
    expect(el.electionName).to.equal("General Assembly 2026");
    expect(el.maxVoters).to.equal(2n);
    expect(el.voterCount).to.equal(0n);
    expect(el.isCompleted).to.be.false;
  });

  it("Should allow registering voters up to the max limit and reject extra voters", async function () {
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 3600;

    await electionAudit.createElection(
      "Municipal Election 2026",
      "Booth 12",
      2, // Limit = 2
      startTime,
      endTime
    );

    const [electionId] = await electionAudit.getAllElections();

    // 1st voter
    await electionAudit.addVoter(
      electionId,
      "VOTER-001",
      "Aarav Sharma",
      "14/08/1995",
      "hash_photo_1"
    );

    // 2nd voter
    await electionAudit.addVoter(
      electionId,
      "VOTER-002",
      "Priya Patel",
      "22/01/1998",
      "hash_photo_2"
    );

    const votersList = await electionAudit.getElectionVoters(electionId);
    expect(votersList.length).to.equal(2);

    // 3rd voter MUST fail because maxVoters is 2
    await expect(
      electionAudit.addVoter(
        electionId,
        "VOTER-003",
        "Rahul Deshmukh",
        "05/11/1990",
        "hash_photo_3"
      )
    ).to.be.revertedWith("Max voter limit reached! Extra voters not allowed.");
  });

  it("Should record verification, mark absent, and complete election session", async function () {
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 3600;

    await electionAudit.createElection("Ward 12 Vote", "Booth 1", 3, startTime, endTime);
    const [electionId] = await electionAudit.getAllElections();

    await electionAudit.addVoter(electionId, "V-1", "John", "10/05/2000", "p1");
    await electionAudit.addVoter(electionId, "V-2", "Jane", "12/09/2001", "p2");

    // Verify V-1
    await electionAudit.recordVoterVerification(electionId, "V-1", true);
    const v1 = await electionAudit.getVoter(electionId, "V-1");
    expect(v1.isVerified).to.be.true;

    // Mark V-2 absent
    await electionAudit.markVoterAbsent(electionId, "V-2");
    const v2 = await electionAudit.getVoter(electionId, "V-2");
    expect(v2.isAbsent).to.be.true;

    // Close election
    await electionAudit.closeElection(electionId);
    const el = await electionAudit.elections(electionId);
    expect(el.isCompleted).to.be.true;
  });
});
