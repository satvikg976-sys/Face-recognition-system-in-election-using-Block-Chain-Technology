// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ElectionAudit
 * @dev Smart contract for MST Blockchain Buildathon 2.0.
 * Manages election sessions with strict voter limits, voter on-chain registration,
 * biometric verification proof, and tamper-proof session completion history.
 */
contract ElectionAudit {
    struct Voter {
        string voterId;
        string name;
        string dob;         // Format: DD/MM/YYYY
        string photoHash;   // Cryptographic hash or identifier of enrolled photo
        bool isRegistered;
        bool isVerified;    // True if successfully verified via face comparison
        bool isAbsent;      // True if marked absent at end of session
        uint256 timestamp;  // Verification or registration timestamp
        address officer;    // Polling officer who processed the voter
    }

    struct Election {
        bytes32 electionId;
        string electionName;
        string boothName;
        uint256 maxVoters;
        uint256 voterCount;
        uint256 startTime;
        uint256 endTime;
        bool isCompleted;
        address createdBy;
    }

    address public admin;
    bytes32[] public allElectionIds;

    // electionId => Election
    mapping(bytes32 => Election) public elections;

    // electionId => list of voter IDs
    mapping(bytes32 => string[]) private electionVoterList;

    // electionId => voterId => Voter
    mapping(bytes32 => mapping(string => Voter)) public electionVoters;

    // Events for MSTScan transparency
    event ElectionCreated(
        bytes32 indexed electionId,
        string electionName,
        string boothName,
        uint256 maxVoters,
        uint256 startTime,
        uint256 endTime,
        address indexed createdBy
    );

    event VoterRegistered(
        bytes32 indexed electionId,
        string voterId,
        string name,
        string dob,
        uint256 currentCount,
        uint256 maxVoters
    );

    event VoterVerified(
        bytes32 indexed electionId,
        string voterId,
        bool isMatched,
        address indexed officer,
        uint256 timestamp
    );

    event VoterMarkedAbsent(
        bytes32 indexed electionId,
        string voterId,
        address indexed officer,
        uint256 timestamp
    );

    event ElectionClosed(
        bytes32 indexed electionId,
        uint256 totalVoters,
        address indexed closedBy,
        uint256 timestamp
    );

    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Create an election session with a strict maximum voter cap and timeframe
     */
    function createElection(
        string memory _electionName,
        string memory _boothName,
        uint256 _maxVoters,
        uint256 _startTime,
        uint256 _endTime
    ) external returns (bytes32) {
        require(_maxVoters > 0, "Max voters must be greater than zero");
        require(_endTime > _startTime, "End time must be after start time");

        bytes32 electionId = keccak256(
            abi.encodePacked(_electionName, _boothName, _startTime, _endTime, msg.sender, block.timestamp)
        );

        require(elections[electionId].electionId == bytes32(0), "Election ID collision");

        elections[electionId] = Election({
            electionId: electionId,
            electionName: _electionName,
            boothName: _boothName,
            maxVoters: _maxVoters,
            voterCount: 0,
            startTime: _startTime,
            endTime: _endTime,
            isCompleted: false,
            createdBy: msg.sender
        });

        allElectionIds.push(electionId);

        emit ElectionCreated(
            electionId,
            _electionName,
            _boothName,
            _maxVoters,
            _startTime,
            _endTime,
            msg.sender
        );

        return electionId;
    }

    /**
     * @notice Register a new voter in the election (enforces strict maximum voter cap)
     */
    function addVoter(
        bytes32 _electionId,
        string memory _voterId,
        string memory _name,
        string memory _dob,
        string memory _photoHash
    ) external {
        Election storage el = elections[_electionId];
        require(el.electionId != bytes32(0), "Election does not exist");
        require(!el.isCompleted, "Election session is already closed");
        require(el.voterCount < el.maxVoters, "Max voter limit reached! Extra voters not allowed.");
        require(!electionVoters[_electionId][_voterId].isRegistered, "Voter ID already registered in this election");

        electionVoters[_electionId][_voterId] = Voter({
            voterId: _voterId,
            name: _name,
            dob: _dob,
            photoHash: _photoHash,
            isRegistered: true,
            isVerified: false,
            isAbsent: false,
            timestamp: block.timestamp,
            officer: msg.sender
        });

        electionVoterList[_electionId].push(_voterId);
        el.voterCount++;

        emit VoterRegistered(
            _electionId,
            _voterId,
            _name,
            _dob,
            el.voterCount,
            el.maxVoters
        );
    }

    /**
     * @notice Record a verified voter on the MST Blockchain
     */
    function recordVoterVerification(
        bytes32 _electionId,
        string memory _voterId,
        bool _isMatched
    ) external {
        Election storage el = elections[_electionId];
        require(el.electionId != bytes32(0), "Election does not exist");
        require(!el.isCompleted, "Election session is completed");
        require(electionVoters[_electionId][_voterId].isRegistered, "Voter is not registered");
        require(!electionVoters[_electionId][_voterId].isVerified, "Voter already verified!");

        Voter storage v = electionVoters[_electionId][_voterId];
        v.isVerified = _isMatched;
        v.timestamp = block.timestamp;
        v.officer = msg.sender;

        emit VoterVerified(_electionId, _voterId, _isMatched, msg.sender, block.timestamp);
    }

    /**
     * @notice Mark a voter as absent at the end of the session
     */
    function markVoterAbsent(
        bytes32 _electionId,
        string memory _voterId
    ) external {
        Election storage el = elections[_electionId];
        require(el.electionId != bytes32(0), "Election does not exist");
        require(electionVoters[_electionId][_voterId].isRegistered, "Voter is not registered");
        require(!electionVoters[_electionId][_voterId].isVerified, "Cannot mark verified voter as absent");

        Voter storage v = electionVoters[_electionId][_voterId];
        v.isAbsent = true;
        v.officer = msg.sender;

        emit VoterMarkedAbsent(_electionId, _voterId, msg.sender, block.timestamp);
    }

    /**
     * @notice Close the election session and lock all data permanently
     */
    function closeElection(bytes32 _electionId) external {
        Election storage el = elections[_electionId];
        require(el.electionId != bytes32(0), "Election does not exist");
        require(!el.isCompleted, "Election already completed");

        el.isCompleted = true;

        emit ElectionClosed(_electionId, el.voterCount, msg.sender, block.timestamp);
    }

    // View helper methods
    function getElectionVoters(bytes32 _electionId) external view returns (string[] memory) {
        return electionVoterList[_electionId];
    }

    function getAllElections() external view returns (bytes32[] memory) {
        return allElectionIds;
    }

    function getVoter(bytes32 _electionId, string memory _voterId) external view returns (Voter memory) {
        return electionVoters[_electionId][_voterId];
    }
}
