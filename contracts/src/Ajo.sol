// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Ajo — a rotating savings circle (ajo / esusu)
/// @notice Every member contributes `contribution` each round. When the last member pays,
///         the whole pot goes to members[round]. Ends once every member has received once.
/// @dev No owner, no admin, no withdraw. Amounts are in the token's units (USDC: 6 decimals).
contract Ajo {
    IERC20 public immutable usdc;
    uint256 public immutable contribution;

    address[] public members;
    mapping(address => bool) public isMember;
    uint256 public round;
    mapping(uint256 => mapping(address => bool)) public paid;
    mapping(uint256 => uint256) public paidCount;
    /// @notice Block of each round's payout, so clients can fetch PaidOut logs without range scans.
    mapping(uint256 => uint256) public payoutBlock;

    event Contributed(uint256 indexed round, address indexed member);
    event PaidOut(uint256 indexed round, address indexed recipient, uint256 amount);

    error NotEnoughMembers();
    error DuplicateMember();
    error ZeroAddress();
    error ZeroContribution();
    error NotMember();
    error CycleComplete();
    error AlreadyPaid();
    error TransferFailed();

    constructor(address _usdc, address[] memory _members, uint256 _contribution) {
        if (_usdc == address(0)) revert ZeroAddress();
        if (_members.length < 2) revert NotEnoughMembers();
        if (_contribution == 0) revert ZeroContribution();

        for (uint256 i = 0; i < _members.length; i++) {
            address m = _members[i];
            if (m == address(0)) revert ZeroAddress();
            if (isMember[m]) revert DuplicateMember();
            isMember[m] = true;
            members.push(m);
        }

        usdc = IERC20(_usdc);
        contribution = _contribution;
    }

    function contribute() external {
        if (!isMember[msg.sender]) revert NotMember();
        uint256 r = round;
        uint256 n = members.length;
        if (r >= n) revert CycleComplete();
        if (paid[r][msg.sender]) revert AlreadyPaid();

        // Effects before any external call.
        paid[r][msg.sender] = true;
        bool roundFull = ++paidCount[r] == n;
        if (roundFull) {
            round = r + 1;
            payoutBlock[r] = block.number;
        }
        emit Contributed(r, msg.sender);

        _call(abi.encodeCall(IERC20.transferFrom, (msg.sender, address(this), contribution)));

        if (roundFull) {
            address recipient = members[r];
            uint256 pot = contribution * n;
            _call(abi.encodeCall(IERC20.transfer, (recipient, pot)));
            emit PaidOut(r, recipient, pot);
        }
    }

    function getMembers() external view returns (address[] memory) {
        return members;
    }

    /// @return address(0) once the cycle is complete.
    function currentRecipient() external view returns (address) {
        return round < members.length ? members[round] : address(0);
    }

    /// @notice Paid flags for the current round, in member order (all false once complete).
    function getPaidStatus() external view returns (bool[] memory status) {
        uint256 n = members.length;
        status = new bool[](n);
        if (round >= n) return status;
        for (uint256 i = 0; i < n; i++) {
            status[i] = paid[round][members[i]];
        }
    }

    /// @dev Tolerates tokens that return nothing as well as ones that return bool.
    function _call(bytes memory data) private {
        (bool ok, bytes memory ret) = address(usdc).call(data);
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }
}
