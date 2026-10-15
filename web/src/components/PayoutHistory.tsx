"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { arc } from "@/lib/chain";
import { usePublicClient } from "wagmi";
import { addressUrl, ajoAbi, formatUsdc, paidOutEvent, shortAddress, txUrl } from "@/lib/ajo";
import { Card, ExternalLink } from "./ui";

type Props = { ajo: Address; members: readonly Address[]; round: bigint; pot: bigint };

/**
 * Past payouts come from contract state (members[0..round-1]); the tx hash comes from the
 * PaidOut log. Arc's public RPC caps eth_getLogs at ~5k blocks, so instead of scanning we read
 * payoutBlock(r) and fetch each log from that single block.
 */
export function PayoutHistory({ ajo, members, round, pot }: Props) {
  const client = usePublicClient({ chainId: arc.id });
  const completed = Number(round);

  const { data: hashes } = useQuery({
    queryKey: ["payouts", ajo, completed],
    enabled: !!client && completed > 0,
    queryFn: async () => {
      const rounds = Array.from({ length: completed }, (_, i) => BigInt(i));
      const blocks = await client!.multicall({
        contracts: rounds.map((r) => ({ address: ajo, abi: ajoAbi, functionName: "payoutBlock", args: [r] }) as const),
        allowFailure: false,
      });
      const logs = await Promise.all(
        rounds.map((r, i) =>
          client!.getLogs({ address: ajo, event: paidOutEvent, args: { round: r }, fromBlock: blocks[i], toBlock: blocks[i] }),
        ),
      );
      return logs.map((l) => l[0]?.transactionHash);
    },
  });

  return (
    <Card title="Payout history">
      {completed === 0 ? (
        <p className="text-sm text-neutral-500">No payouts yet. The first pot goes out when every member has paid round 1.</p>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {Array.from({ length: completed }, (_, i) => completed - 1 - i).map((r) => (
            <li key={r} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="text-neutral-500">Round {r + 1}</span>
              <ExternalLink href={addressUrl(members[r])}>
                <span className="font-mono">{shortAddress(members[r])}</span>
              </ExternalLink>
              <span className="font-medium tabular-nums">{formatUsdc(pot)}</span>
              {hashes?.[r] ? (
                <ExternalLink href={txUrl(hashes[r])}>tx ↗</ExternalLink>
              ) : (
                <span className="text-neutral-400">…</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
