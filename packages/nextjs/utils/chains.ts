import { defineChain } from "viem";

export const hyperEvmMainnet = defineChain({
  id: 999,
  name: "HyperEVM Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "HYPE",
    symbol: "HYPE",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
    public: {
      http: ["https://rpc.hyperliquid.xyz/evm"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.hyperliquid.xyz" },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 1,
    },
  },
});

export const hyperEvmTestnet = defineChain({
  id: 998,
  name: "HyperEVM Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HYPE",
    symbol: "HYPE",
  },
  rpcUrls: {
    default: {
      http: ["https://api.hyperliquid-testnet.xyz/evm"],
    },
    public: {
      http: ["https://api.hyperliquid-testnet.xyz/evm"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.hyperliquid-testnet.xyz" },
  },
  testnet: true,
});
