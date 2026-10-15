import { formatUnits, getAbiItem, isAddress, type Address } from "viem";
import { arc } from "@/lib/chain";
import { ajoAbi } from "./abi";

export { ajoAbi };

/** Arc's USDC ERC-20 interface. 6 decimals (native gas USDC is 18 — never mix them). */
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;

export const paidOutEvent = getAbiItem({ abi: ajoAbi, name: "PaidOut" });

const envAddress = process.env.NEXT_PUBLIC_AJO_ADDRESS;
export const DEFAULT_AJO_ADDRESS: Address | undefined =
  envAddress && isAddress(envAddress) ? envAddress : undefined;

const EXPLORER = arc.blockExplorers.default.url;
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addressUrl = (address: string) => `${EXPLORER}/address/${address}`;

export const formatUsdc = (amount: bigint) => `${formatUnits(amount, USDC_DECIMALS)} USDC`;
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
