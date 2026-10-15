import { defineChain } from "viem";

// Mirrors viem's built-in `arc` chain (viem/chains). Defined locally so we don't pull in the
// whole viem/chains barrel, which drags in unrelated chain code and webpack warnings.
export const arc = defineChain({
  id: 5042,
  name: "Arc",
  // Native gas token is USDC with 18 decimals. The USDC ERC-20 interface uses 6.
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.arc.io", apiUrl: "https://explorer.arc.io/api/v2" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11", blockCreated: 0 },
  },
});
