"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { arc } from "@/lib/chain";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/** A contract write plus its receipt; refetches every query once the tx confirms. */
export function useTx() {
  const queryClient = useQueryClient();
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: arc.id });

  useEffect(() => {
    if (receipt.isSuccess) queryClient.invalidateQueries();
  }, [receipt.isSuccess, queryClient]);

  return {
    write,
    hash: write.data,
    isBusy: write.isPending || (!!write.data && receipt.isLoading),
    isConfirmed: receipt.isSuccess,
    error: write.error ?? receipt.error,
    status: write.isPending
      ? "Confirm in your wallet…"
      : write.data && receipt.isLoading
        ? "Pending on Arc…"
        : receipt.isSuccess
          ? "Confirmed ✓"
          : undefined,
  };
}
