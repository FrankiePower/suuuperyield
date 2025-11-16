// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {RolesAuthority} from "solmate/auth/authorities/RolesAuthority.sol";

/**
 * @title GrantTellerPermissions
 * @notice Grant DepositTeller permission to call vault.enter() and vault.exit()
 * @dev Fixes UNAUTHORIZED error when users try to deposit
 */
contract GrantTellerPermissions is Script {
    // Deployed contract addresses
    address constant AUTHORITY = 0x86f11a6db84635f566430e7cB0224F6C4ac6a28F;
    address constant VAULT = 0x8851862f714f2984c3E3Bcfc9Fafb57D67dB6845;
    address constant TELLER = 0x2f245E60EE78Acb2847D8FE1336725307C7B38Df;

    // Role constants
    uint8 constant TELLER_ROLE = 2;

    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("AGENT_WALLET");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Granting DepositTeller permissions...");
        console.log("Caller:", deployer);
        console.log("Authority:", AUTHORITY);
        console.log("Vault:", VAULT);
        console.log("Teller:", TELLER);

        vm.startBroadcast(deployerPrivateKey);

        RolesAuthority authority = RolesAuthority(AUTHORITY);

        // Grant TELLER_ROLE capability to call vault.enter()
        authority.setRoleCapability(
            TELLER_ROLE,
            VAULT,  // Target contract (vault, not teller)
            bytes4(keccak256("enter(address,address,uint256,address,uint256)")),
            true
        );

        console.log("Granted enter() capability to TELLER_ROLE");

        // Grant TELLER_ROLE capability to call vault.exit()
        authority.setRoleCapability(
            TELLER_ROLE,
            VAULT,  // Target contract (vault, not teller)
            bytes4(keccak256("exit(address,address,uint256,address,uint256)")),
            true
        );

        console.log("Granted exit() capability to TELLER_ROLE");

        // Grant TELLER_ROLE to the DepositTeller contract
        authority.setUserRole(address(TELLER), TELLER_ROLE, true);

        console.log("Granted TELLER_ROLE to DepositTeller contract");

        vm.stopBroadcast();

        console.log("\n=================================");
        console.log("PERMISSIONS GRANTED SUCCESSFULLY");
        console.log("=================================");
        console.log("DepositTeller can now call:");
        console.log("  - vault.enter()");
        console.log("  - vault.exit()");
        console.log("=================================");
    }
}
