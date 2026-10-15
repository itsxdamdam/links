"use client";

import type { Address } from "viem";
import { arc } from "@/lib/chain";
import { useConnection, useReadContracts } from "wagmi";
import { addressUrl, ajoAbi, formatUsdc, shortAddress } from "@/lib/ajo";
import { ActionArea } from "./ActionArea";
import { PayoutHistory } from "./PayoutHistory";
import { Badge, Card, ExternalLink, Stat } from "./ui";

export function Circle({ address }: { address: Address }) {
  const { address: account, chainId, isConnected } = useConnection();
  const ajo = { address, abi: ajoAbi, chainId: arc.id } as const;
  const { data, error, isLoading } = useReadContracts({
    contracts: [
      { ...ajo, functionName: "getMembers" },
      { ...ajo, functionName: "contribution" },
      { ...ajo, functionName: "round" },
      { ...ajo, functionName: "getPaidStatus" },
    ],
    allowFailure: false,
    query: { refetchInterval: 10_000 },
  });

  if (isLoading) return <Card>Loading circle…</Card>;
  if (error || !data) {
    return (
      <Card>
        <p className="text-sm text-red-600">Couldn&apos;t load the circle at {shortAddress(address)}. Is the address right?</p>
      </Card>
    );
  }

  const [members, contribution, round, paidStatus] = data;
  const n = BigInt(members.length);
  const complete = round >= n;
  const pot = contribution * n;
  const paidCount = paidStatus.filter(Boolean).length;
  const myIndex = account ? members.findIndex((m) => m.toLowerCase() === account.toLowerCase()) : -1;
  const isMember = myIndex >= 0;
  const onArc = chainId === arc.id;

  return (
    <div className="space-y-4">
      <Card title="This circle">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Contribution / round" value={formatUsdc(contribution)} />
          <Stat label="Pot size" value={formatUsdc(pot)} />
          <Stat label="Round" value={complete ? "Done" : `${round + 1n} of ${n}`} />
          <Stat
            label="Current recipient"
            value={
              complete ? (
                "—"
              ) : (
                <ExternalLink href={addressUrl(members[Number(round)])}>
                  <span className="font-mono text-base">{shortAddress(members[Number(round)])}</span>
                </ExternalLink>
              )
            }
          />
        </div>
        {complete ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            🎉 Cycle complete. Every member has received the pot once.
          </p>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            {paidCount} of {members.length} paid this round. The pot is sent automatically when the last member pays.
          </p>
        )}
      </Card>

      <Card title="Members">
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((m, i) => (
            <li key={m} className="flex items-center justify-between gap-2 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="w-5 text-xs text-neutral-400 tabular-nums">{i + 1}</span>
                <ExternalLink href={addressUrl(m)}>
                  <span className="font-mono text-sm">{shortAddress(m)}</span>
                </ExternalLink>
                {i === myIndex && <Badge>You</Badge>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {BigInt(i) < round && <Badge tone="green">Received</Badge>}
                {!complete && BigInt(i) === round && <Badge tone="amber">Receives this round</Badge>}
                {!complete && (
                  <span className="text-sm" title={paidStatus[i] ? "Paid" : "Pending"}>
                    {paidStatus[i] ? "✅" : "⏳"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {!complete && isConnected && account && (
        <>
          {!onArc ? (
            <Card>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Switch your wallet to Arc to contribute.</p>
            </Card>
          ) : !isMember ? (
            <Card>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">This wallet isn&apos;t a member of this circle.</p>
            </Card>
          ) : paidStatus[myIndex] ? (
            <Card>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                ✅ You&apos;ve paid round {(round + 1n).toString()}. Waiting on {members.length - paidCount} more.
              </p>
            </Card>
          ) : (
            <ActionArea ajo={address} account={account} contribution={contribution} remainingRounds={n - round} />
          )}
        </>
      )}

      <PayoutHistory ajo={address} members={members} round={round} pot={pot} />
    </div>
  );
}
