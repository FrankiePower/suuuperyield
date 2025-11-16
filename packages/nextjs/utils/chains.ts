import { Chain } from "viem";

export const hyperEVM: Chain = {
  id: 999,
  name: "Hyperliquid",
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
    default: {
      name: "HyperEVM Explorer",
      url: "https://hyperevmscan.io",
    },
  },
  contracts: {
    // Add any known contract addresses if needed
  },
};

export const hyperEVMTestnet: Chain = {
  id: 998,
  name: "Hyperliquid Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "HYPE",
    symbol: "HYPE",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.hyperliquid.xyz/evm"],
    },
    public: {
      http: ["https://rpc-testnet.hyperliquid.xyz/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "HyperEVM Testnet Explorer",
      url: "https://testnet.hyperevmscan.io",
    },
  },
  testnet: true,
};
