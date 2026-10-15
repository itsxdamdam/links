// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ajo} from "../src/Ajo.sol";

contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract AjoTest is Test {
    uint256 constant CONTRIBUTION = 100_000; // 0.1 USDC
    uint256 constant START_BALANCE = 10_000_000; // 10 USDC

    MockUSDC usdc;
    Ajo ajo;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address[] members;

    event Contributed(uint256 indexed round, address indexed member);
    event PaidOut(uint256 indexed round, address indexed recipient, uint256 amount);

    function setUp() public {
        usdc = new MockUSDC();
        members = [alice, bob, carol];
        ajo = new Ajo(address(usdc), members, CONTRIBUTION);

        for (uint256 i = 0; i < members.length; i++) {
            usdc.mint(members[i], START_BALANCE);
            vm.prank(members[i]);
            usdc.approve(address(ajo), type(uint256).max);
        }
    }

    function _pay(address m) internal {
        vm.prank(m);
        ajo.contribute();
    }

    function _payRound() internal {
        for (uint256 i = 0; i < members.length; i++) {
            _pay(members[i]);
        }
    }

    function test_FullCycle() public {
        uint256 pot = CONTRIBUTION * 3;

        for (uint256 r = 0; r < 3; r++) {
            assertEq(ajo.round(), r);
            assertEq(ajo.currentRecipient(), members[r]);

            vm.roll(block.number + 10);
            _pay(alice);
            _pay(bob);
            assertEq(ajo.paidCount(r), 2);
            assertEq(ajo.payoutBlock(r), 0);
            assertEq(usdc.balanceOf(address(ajo)), CONTRIBUTION * 2);

            vm.expectEmit(address(ajo));
            emit Contributed(r, carol);
            vm.expectEmit(address(ajo));
            emit PaidOut(r, members[r], pot);
            _pay(carol);

            assertEq(ajo.round(), r + 1);
            assertEq(ajo.payoutBlock(r), block.number);
            assertEq(usdc.balanceOf(address(ajo)), 0);
        }

        // Everyone paid 3 and received the pot once: net zero.
        for (uint256 i = 0; i < members.length; i++) {
            assertEq(usdc.balanceOf(members[i]), START_BALANCE);
        }
        assertEq(ajo.currentRecipient(), address(0));
        assertEq(ajo.getMembers().length, 3);
    }

    function test_RecipientReceivesPotMidCycle() public {
        _payRound();
        // alice paid 1, received 3
        assertEq(usdc.balanceOf(alice), START_BALANCE + CONTRIBUTION * 2);
        assertEq(usdc.balanceOf(bob), START_BALANCE - CONTRIBUTION);
    }

    function test_PaidStatus() public {
        _pay(bob);
        bool[] memory s = ajo.getPaidStatus();
        assertFalse(s[0]);
        assertTrue(s[1]);
        assertFalse(s[2]);
    }

    function test_RevertWhen_DoublePay() public {
        _pay(alice);
        vm.expectRevert(Ajo.AlreadyPaid.selector);
        _pay(alice);
    }

    function test_RevertWhen_NonMember() public {
        address mallory = makeAddr("mallory");
        vm.expectRevert(Ajo.NotMember.selector);
        _pay(mallory);
    }

    function test_RevertWhen_ContributeAfterCycleComplete() public {
        _payRound();
        _payRound();
        _payRound();
        vm.expectRevert(Ajo.CycleComplete.selector);
        _pay(alice);
    }

    function test_RevertWhen_NoAllowance() public {
        vm.prank(alice);
        usdc.approve(address(ajo), 0);
        vm.expectRevert(Ajo.TransferFailed.selector);
        _pay(alice);
    }

    function test_RevertWhen_BadConstructorArgs() public {
        address[] memory one = new address[](1);
        one[0] = alice;
        vm.expectRevert(Ajo.NotEnoughMembers.selector);
        new Ajo(address(usdc), one, CONTRIBUTION);

        address[] memory dup = new address[](2);
        dup[0] = alice;
        dup[1] = alice;
        vm.expectRevert(Ajo.DuplicateMember.selector);
        new Ajo(address(usdc), dup, CONTRIBUTION);

        vm.expectRevert(Ajo.ZeroContribution.selector);
        new Ajo(address(usdc), members, 0);
    }
}
