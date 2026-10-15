"use client";

import { erc20Abi, type Address, type BaseError } from "viem";
import { arc } from "@/lib/chain";
import { useReadContracts } from "wagmi";
import { ajoAbi, formatUsdc, txUrl, USDC_ADDRESS } from "@/lib/ajo";
import { Button, Card, ExternalLink } from "./ui";
import { useTx } from "./useTx";

type Props = {
  ajo: Address;
  account: Address;
  contribution: bigint;
  remainingRounds: bigint;
};

/** Rendered only for a connected member, on Arc, who hasn't paid this round. */
export function ActionArea({ ajo, account, contribution, remainingRounds }: Props) {
  const usdc = { address: USDC_ADDRESS, abi: erc20Abi, chainId: arc.id } as const;
  const { data } = useReadContracts({
    contracts: [
      { ...usdc, functionName: "allowance", args: [account, ajo] },
      { ...usdc, functionName: "balanceOf", args: [account] },
    ],
    allowFailure: false,
  });
  const approve = useTx();
  const contribute = useTx();

  if (!data) return <Card title="Your turn to pay">Loading your balance…</Card>;
  const [allowance, balance] = data;
  const needsApproval = allowance < contribution;
  // Approve once for every round still to come, so members only approve a single time.
  const approveAmount = contribution * remainingRounds;

  return (
    <Card title="Your turn to pay">
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
        You haven&apos;t paid this round yet. Balance: {formatUsdc(balance)}
      </p>

      {balance < contribution && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          You need at least {formatUsdc(contribution)} plus a little for gas.
        </p>
      )}

      {needsApproval ? (
        <Button
          className="w-full"
          disabled={approve.isBusy}
          onClick={() =>
            approve.write.mutate({ ...usdc, functionName: "approve", args: [ajo, approveAmount] })
          }
        >
          Approve {formatUsdc(approveAmount)}
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={contribute.isBusy || balance < contribution}
          onClick={() =>
            contribute.write.mutate({ address: ajo, abi: ajoAbi, chainId: arc.id, functionName: "contribute" })
          }
        >
          Contribute {formatUsdc(contribution)}
        </Button>
      )}

      {needsApproval && (
        <p className="mt-2 text-xs text-neutral-500">
          One approval covers all {remainingRounds.toString()} remaining round(s).
        </p>
      )}

      <TxStatus label="Approval" tx={approve} />
      <TxStatus label="Contribution" tx={contribute} />
    </Card>
  );
}

function TxStatus({ label, tx }: { label: string; tx: ReturnType<typeof useTx> }) {
  if (tx.error) {
    return (
      <p className="mt-3 text-sm text-red-600">
        {label} failed: {(tx.error as BaseError).shortMessage ?? tx.error.message}
      </p>
    );
  }
  if (!tx.status) return null;
  return (
    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
      {label}: {tx.status} {tx.hash && <ExternalLink href={txUrl(tx.hash)}>View tx</ExternalLink>}
    </p>
  );
}
