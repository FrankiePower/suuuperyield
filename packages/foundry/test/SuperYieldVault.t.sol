// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {SuperYieldVault} from "../contracts/SuperYieldVault.sol";
import {StrategyManager} from "../contracts/StrategyManager.sol";
import {DepositTeller} from "../contracts/DepositTeller.sol";
import {YieldAccountant} from "../contracts/YieldAccountant.sol";
import {RolesAuthority} from "solmate/auth/authorities/RolesAuthority.sol";

contract SuperYieldVaultTest is Test {
    SuperYieldVault public vault;
    StrategyManager public manager;
    DepositTeller public teller;
    YieldAccountant public accountant;
    RolesAuthority public authority;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);

    // Test constants
    string constant VAULT_NAME = "SuperYield Vault";
    string constant VAULT_SYMBOL = "syETH";
    uint8 constant VAULT_DECIMALS = 18;

    function setUp() public {
        // Deploy authority
        authority = new RolesAuthority(owner, RolesAuthority(address(0)));

        // Deploy vault
        vault = new SuperYieldVault(
            owner,
            VAULT_NAME,
            VAULT_SYMBOL,
            VAULT_DECIMALS
        );

        // Deploy accountant
        accountant = new YieldAccountant(
            owner,
            authority,
            address(vault),
            VAULT_DECIMALS
        );

        // Deploy manager
        manager = new StrategyManager(
            owner,
            authority,
            address(vault)
        );

        // Deploy teller
        teller = new DepositTeller(
            owner,
            authority,
            address(vault),
            address(accountant)
        );

        console.log("Vault deployed at:", address(vault));
        console.log("Manager deployed at:", address(manager));
        console.log("Teller deployed at:", address(teller));
        console.log("Accountant deployed at:", address(accountant));
    }

    function test_VaultInitialization() public {
        assertEq(vault.name(), VAULT_NAME);
        assertEq(vault.symbol(), VAULT_SYMBOL);
        assertEq(vault.decimals(), VAULT_DECIMALS);
    }

    function test_GlueXVaultsWhitelisted() public {
        address[5] memory vaults = vault.getWhitelistedVaults();

        assertEq(vaults.length, 5);
        assertEq(vaults[0], 0xE25514992597786E07872e6C5517FE1906C0CAdD);
        assertEq(vaults[1], 0xCdc3975df9D1cf054F44ED238Edfb708880292EA);
        assertEq(vaults[2], 0x8F9291606862eEf771a97e5B71e4B98fd1Fa216a);
        assertEq(vaults[3], 0x9f75Eac57d1c6F7248bd2AEDe58C95689f3827f7);
        assertEq(vaults[4], 0x63Cf7EE583d9954FeBF649aD1c40C97a6493b1Be);

        // Check mapping
        assertTrue(vault.isVaultWhitelisted(vaults[0]));
        assertTrue(vault.isVaultWhitelisted(vaults[1]));
        assertTrue(vault.isVaultWhitelisted(vaults[2]));
        assertTrue(vault.isVaultWhitelisted(vaults[3]));
        assertTrue(vault.isVaultWhitelisted(vaults[4]));

        // Check non-whitelisted address
        assertFalse(vault.isVaultWhitelisted(address(0xdead)));
    }

    function test_ManagerInitialization() public {
        assertEq(manager.VAULT(), address(vault));
        assertEq(manager.totalAllocated(), 0);

        address[5] memory vaults = manager.getWhitelistedVaults();
        assertEq(vaults.length, 5);
    }

    function test_TellerInitialization() public {
        assertEq(teller.VAULT(), address(vault));
        assertEq(teller.accountant(), address(accountant));
    }

    function test_AccountantInitialization() public {
        assertEq(accountant.VAULT(), address(vault));
        assertEq(accountant.DECIMALS(), VAULT_DECIMALS);
        assertEq(accountant.exchangeRate(), accountant.BASE()); // Should start at 1:1
        assertGt(accountant.lastUpdateTime(), 0);
    }

    function test_AccountantShareCalculations() public {
        // Test deposit preview (1:1 initially)
        uint256 depositAmount = 1 ether;
        uint256 expectedShares = accountant.previewDeposit(depositAmount);
        assertEq(expectedShares, depositAmount);

        // Test withdraw preview
        uint256 shareAmount = 1 ether;
        uint256 expectedAssets = accountant.previewWithdraw(shareAmount);
        assertEq(expectedAssets, shareAmount);
    }

    function test_AccountantExchangeRateUpdate() public {
        uint256 totalAssets = 10 ether;
        uint256 totalShares = 10 ether;

        // Update exchange rate
        accountant.updateExchangeRate(totalAssets, totalShares);

        // Should still be 1:1
        assertEq(accountant.exchangeRate(), accountant.BASE());

        // Simulate yield generation (11 ether assets for 10 ether shares)
        accountant.updateExchangeRate(11 ether, 10 ether);

        // Exchange rate should increase
        assertGt(accountant.exchangeRate(), accountant.BASE());

        // Total yield should be tracked
        assertGt(accountant.totalYieldGenerated(), 0);
    }

    function test_AccountantAPYCalculation() public {
        // Initially should be 0
        assertEq(accountant.getApy(), 0);

        // After adding yield, should have APY
        accountant.updateExchangeRate(11 ether, 10 ether);

        // APY should be > 0 (exact value depends on time elapsed)
        uint256 apy = accountant.getApy();
        console.log("APY after 10% gain:", apy);
    }

    function test_AccountantMetrics() public {
        // Set some state
        accountant.updateExchangeRate(11 ether, 10 ether);

        (
            uint256 rate,
            uint256 totalYield,
            uint256 lastUpdate,
            uint256 apy
        ) = accountant.getMetrics();

        assertGt(rate, accountant.BASE());
        assertGt(totalYield, 0);
        assertGt(lastUpdate, 0);
        console.log("Metrics - Rate:", rate);
        console.log("Metrics - Total Yield:", totalYield);
        console.log("Metrics - APY:", apy);
    }

    function test_AllContractsDeployed() public {
        assertTrue(address(vault) != address(0));
        assertTrue(address(manager) != address(0));
        assertTrue(address(teller) != address(0));
        assertTrue(address(accountant) != address(0));
        assertTrue(address(authority) != address(0));
    }

    function test_VaultOwnership() public {
        assertEq(vault.owner(), owner);
        assertEq(manager.owner(), owner);
        assertEq(teller.owner(), owner);
        assertEq(accountant.owner(), owner);
    }
}
