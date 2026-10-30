const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("==================================================");
  console.log("🚀 MST Blockchain - Deploying ElectionAudit");
  console.log("Network Name:    ", hre.network.name);
  console.log("Chain ID:        ", network.chainId.toString());
  console.log("Deployer Address:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(balance), "MSTC/tMSTC");
  console.log("==================================================");

  // Deploy Contract
  const ElectionAudit = await hre.ethers.getContractFactory("ElectionAudit");
  const electionAudit = await ElectionAudit.deploy();
  await electionAudit.waitForDeployment();

  const contractAddress = await electionAudit.getAddress();
  console.log("✅ ElectionAudit deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);

  // Explorer link
  const explorerUrl =
    network.chainId.toString() === "91562037"
      ? `https://testnet.mstscan.com/address/${contractAddress}`
      : `https://mstscan.com/address/${contractAddress}`;
  console.log("🔗 Explorer Link:   ", explorerUrl);

  // Seed with Initial Demo Session on MST Testnet
  console.log("\n📦 Initializing First Demo Election Session...");
  const startTime = Math.floor(Date.now() / 1000);
  const endTime = startTime + 86400 * 7; // Active for 7 days

  const sessionTx = await electionAudit.createSession(
    "Pune",
    "Pimpri",
    "Ward 12 - Kohinoor",
    "Booth 403 (KWT Tower 3)",
    "2026-11-01",
    startTime,
    endTime
  );
  const sessionReceipt = await sessionTx.wait();
  console.log("✅ Demo Election Session Created!");
  console.log("Tx Hash (Session Creation):", sessionReceipt.hash);

  const sessions = await electionAudit.getAllSessions();
  const sessionId = sessions[0];
  console.log("Session ID: ", sessionId);

  // Seed with a Sample Verified Voter Transaction
  console.log("\n🗳️ Logging Sample Voter Verification Event on MST Blockchain...");
  const sampleVoterHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("VOTER_SAMPLE_MST_BUILDATHON_2026")
  );
  const sampleCaptureHash = hre.ethers.keccak256(
    hre.ethers.toUtf8Bytes("SAMPLE_WEBCAM_FRAME_HASH")
  );

  const verifyTx = await electionAudit.recordVerification(
    sessionId,
    sampleVoterHash,
    sampleCaptureHash,
    1, // MATCHED
    98, // 98% confidence
    "Live biometric facial verification matched against enrolled record"
  );
  const verifyReceipt = await verifyTx.wait();
  console.log("✅ Sample Voter Verification Logged on-chain!");
  console.log("Tx Hash (Verification Event):", verifyReceipt.hash);

  const verifyTxExplorer =
    network.chainId.toString() === "91562037"
      ? `https://testnet.mstscan.com/tx/${verifyReceipt.hash}`
      : `https://mstscan.com/tx/${verifyReceipt.hash}`;
  console.log("🔗 Verification Explorer Link:", verifyTxExplorer);

  // Save deployment artifact for Frontend
  const deploymentInfo = {
    network: hre.network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    admin: deployer.address,
    initialSessionId: sessionId,
    sessionCreationTx: sessionReceipt.hash,
    sampleVerificationTx: verifyReceipt.hash,
    explorerLinks: {
      contract: explorerUrl,
      sessionTx:
        network.chainId.toString() === "91562037"
          ? `https://testnet.mstscan.com/tx/${sessionReceipt.hash}`
          : `https://mstscan.com/tx/${sessionReceipt.hash}`,
      verificationTx: verifyTxExplorer,
    },
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "../deployed-config.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Saved deployment details to ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
