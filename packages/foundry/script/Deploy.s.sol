//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import {DeploySuperYield} from "./DeploySuperYield.s.sol";

/**
 * @notice Main deployment script for SuperYield contracts
 * @dev Run this to deploy all SuperYield contracts at once
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Deploy SuperYield contracts
        DeploySuperYield deploySuperYield = new DeploySuperYield();
        deploySuperYield.run();
    }
}
