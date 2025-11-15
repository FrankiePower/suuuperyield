// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {BoringVault} from "boring-vault/base/BoringVault.sol";

/**
 * @title SuperYieldVault
 * @notice AI-powered yield optimizer vault that allocates funds to GlueX vaults
 * @dev Inherits from BoringVault for secure asset custody
 *
 * Key Features:
 * - Holds user deposits securely
 * - AI agent can allocate to whitelisted GlueX vaults
 * - ERC20 compliant (shares token)
 * - Role-based access control
 */
contract SuperYieldVault is BoringVault {

    /// @notice GlueX vault addresses (from hackathon requirements)
    address[5] public glueXVaults = [
        0xE25514992597786E07872e6C5517FE1906C0CAdD,
        0xCdc3975df9D1cf054F44ED238Edfb708880292EA,
        0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a,
        0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7,
        0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be
    ];

    /// @notice Mapping to quickly check if an address is a whitelisted GlueX vault
    mapping(address => bool) public isWhitelistedVault;

    /// @notice Event emitted when funds are allocated to a GlueX vault
    event AllocatedToGlueX(address indexed vault, uint256 amount);

    /// @notice Event emitted when funds are withdrawn from a GlueX vault
    event WithdrawnFromGlueX(address indexed vault, uint256 amount);

    /**
     * @notice Constructor
     * @param _owner Address that will own the vault (has admin rights)
     * @param _name Name of the share token (e.g., "SuperYield Shares")
     * @param _symbol Symbol of the share token (e.g., "syETH")
     * @param _decimals Decimals for the share token (typically 18)
     */
    constructor(
        address _owner,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) BoringVault(_owner, _name, _symbol, _decimals) {
        // Whitelist all GlueX vaults
        for (uint256 i = 0; i < glueXVaults.length; i++) {
            isWhitelistedVault[glueXVaults[i]] = true;
        }
    }

    /**
     * @notice Get the list of all whitelisted GlueX vaults
     * @return Array of GlueX vault addresses
     */
    function getWhitelistedVaults() external view returns (address[5] memory) {
        return glueXVaults;
    }

    /**
     * @notice Check if a vault is whitelisted
     * @param vault Address to check
     * @return bool True if vault is whitelisted
     */
    function isVaultWhitelisted(address vault) external view returns (bool) {
        return isWhitelistedVault[vault];
    }
}
