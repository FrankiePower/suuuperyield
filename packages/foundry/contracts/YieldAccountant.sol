// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {Auth, Authority} from "solmate/auth/Auth.sol";

/**
 * @title YieldAccountant
 * @notice Tracks vault performance, share pricing, and yield metrics
 * @dev Provides the pricing oracle for the vault's share token
 *
 * Key Features:
 * - Calculates share price based on total assets and total shares
 * - Tracks yield performance over time
 * - Updates exchange rate for deposits/withdrawals
 * - Provides data for AI agent decision making
 */
contract YieldAccountant is Auth {
    /// @notice The SuperYieldVault this accountant services
    address public immutable VAULT;

    /// @notice Base for all calculations (1e18)
    uint256 public constant BASE = 1e18;

    /// @notice Exchange rate (assets per share, scaled by BASE)
    uint256 public exchangeRate;

    /// @notice Last time the exchange rate was updated
    uint256 public lastUpdateTime;

    /// @notice Total yield generated (in base asset)
    uint256 public totalYieldGenerated;

    /// @notice Decimals for the base asset
    uint8 public immutable DECIMALS;

    /// @notice Events
    event ExchangeRateUpdated(uint256 newRate, uint256 timestamp);
    event YieldAccrued(uint256 amount, uint256 newTotal);
    event PerformanceSnapshot(uint256 totalAssets, uint256 totalShares, uint256 rate);

    /// @notice Errors
    error InvalidExchangeRate(uint256 rate);
    error StaleUpdate(uint256 lastUpdate, uint256 attempted);

    /**
     * @notice Constructor
     * @param _owner Address with admin rights
     * @param _authority Authority contract for role-based access control
     * @param _vault Address of the SuperYieldVault
     * @param _decimals Decimals for the base asset
     */
    constructor(
        address _owner,
        Authority _authority,
        address _vault,
        uint8 _decimals
    ) Auth(_owner, _authority) {
        VAULT = _vault;
        DECIMALS = _decimals;
        exchangeRate = BASE; // Start at 1:1
        lastUpdateTime = block.timestamp;
    }

    /**
     * @notice Update the exchange rate based on current vault state
     * @param totalAssets Total assets held by the vault (including allocations)
     * @param totalShares Total shares outstanding
     * @dev Only callable by authorized addresses (usually the vault or manager)
     */
    function updateExchangeRate(
        uint256 totalAssets,
        uint256 totalShares
    ) external requiresAuth {
        if (totalShares == 0) {
            // No shares exist, keep rate at BASE
            exchangeRate = BASE;
        } else {
            // Calculate new rate: (totalAssets * BASE) / totalShares
            uint256 newRate = (totalAssets * BASE) / totalShares;

            if (newRate == 0) {
                revert InvalidExchangeRate(newRate);
            }

            // If rate increased, yield was generated
            if (newRate > exchangeRate) {
                uint256 yieldGenerated = ((newRate - exchangeRate) * totalShares) / BASE;
                totalYieldGenerated += yieldGenerated;
                emit YieldAccrued(yieldGenerated, totalYieldGenerated);
            }

            exchangeRate = newRate;
        }

        lastUpdateTime = block.timestamp;
        emit ExchangeRateUpdated(exchangeRate, block.timestamp);
        emit PerformanceSnapshot(totalAssets, totalShares, exchangeRate);
    }

    /**
     * @notice Get the current share price (how many assets per share)
     * @return uint256 The exchange rate (scaled by BASE)
     */
    function getSharePrice() external view returns (uint256) {
        return exchangeRate;
    }

    /**
     * @notice Calculate how many shares to mint for a given asset amount
     * @param assetAmount The amount of assets being deposited
     * @return shares The number of shares to mint
     */
    function previewDeposit(uint256 assetAmount) external view returns (uint256 shares) {
        if (exchangeRate == 0) {
            return assetAmount; // 1:1 if no rate set
        }
        // shares = (assetAmount * BASE) / exchangeRate
        shares = (assetAmount * BASE) / exchangeRate;
    }

    /**
     * @notice Calculate how many assets to return for burning shares
     * @param shareAmount The number of shares being burned
     * @return assets The amount of assets to return
     */
    function previewWithdraw(uint256 shareAmount) external view returns (uint256 assets) {
        // assets = (shareAmount * exchangeRate) / BASE
        assets = (shareAmount * exchangeRate) / BASE;
    }

    /**
     * @notice Get the current APY based on recent performance
     * @dev Simplified APY calculation for demo purposes
     * @return apy The current APY (scaled by 100, e.g., 500 = 5.00%)
     */
    function getApy() external view returns (uint256 apy) {
        // Simple implementation: if rate > BASE, calculate annualized return
        if (exchangeRate <= BASE || lastUpdateTime == 0) {
            return 0;
        }

        uint256 timeSinceStart = block.timestamp - lastUpdateTime;
        if (timeSinceStart == 0) {
            return 0;
        }

        // Calculate percentage increase
        uint256 percentIncrease = ((exchangeRate - BASE) * 10000) / BASE;

        // Annualize (simple approximation)
        uint256 secondsPerYear = 365 days;
        apy = (percentIncrease * secondsPerYear) / timeSinceStart;
    }

    /**
     * @notice Get total yield generated since inception
     * @return uint256 Total yield in base asset
     */
    function getTotalYield() external view returns (uint256) {
        return totalYieldGenerated;
    }

    /**
     * @notice Get the last update timestamp
     * @return uint256 Timestamp of last rate update
     */
    function getLastUpdateTime() external view returns (uint256) {
        return lastUpdateTime;
    }

    /**
     * @notice Manually set exchange rate (emergency use only)
     * @param newRate The new exchange rate
     * @dev Only callable by owner, used for emergency corrections
     */
    function setExchangeRate(uint256 newRate) external requiresAuth {
        if (newRate == 0) {
            revert InvalidExchangeRate(newRate);
        }

        exchangeRate = newRate;
        lastUpdateTime = block.timestamp;

        emit ExchangeRateUpdated(newRate, block.timestamp);
    }

    /**
     * @notice Get comprehensive vault metrics
     * @return rate Current exchange rate
     * @return totalYield Total yield generated
     * @return lastUpdate Last update timestamp
     * @return apy Current APY estimate
     */
    function getMetrics() external view returns (
        uint256 rate,
        uint256 totalYield,
        uint256 lastUpdate,
        uint256 apy
    ) {
        rate = exchangeRate;
        totalYield = totalYieldGenerated;
        lastUpdate = lastUpdateTime;

        // Calculate APY
        if (exchangeRate <= BASE || lastUpdateTime == 0) {
            apy = 0;
        } else {
            uint256 timeSinceStart = block.timestamp - lastUpdateTime;
            if (timeSinceStart > 0) {
                uint256 percentIncrease = ((exchangeRate - BASE) * 10000) / BASE;
                uint256 secondsPerYear = 365 days;
                apy = (percentIncrease * secondsPerYear) / timeSinceStart;
            }
        }
    }
}
