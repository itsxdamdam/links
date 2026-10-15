// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Ajo} from "../src/Ajo.sol";

contract Deploy is Script {
    address constant ARC_USDC = 0x3600000000000000000000000000000000000000;

    function run() external returns (Ajo ajo) {
        address[] memory members = vm.envAddress("MEMBERS", ",");
        uint256 contribution = vm.envOr("CONTRIBUTION", uint256(100_000));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        ajo = new Ajo(ARC_USDC, members, contribution);
        vm.stopBroadcast();

        console.log("Ajo deployed at", address(ajo));
        console.log("Members", members.length, "contribution", contribution);
    }
}
