"use client";

import type { BaseError } from "viem";
import { arc } from "@/lib/chain";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/ajo";
import { Button } from "./ui";

export function ConnectButton() {
  const { address, chainId, isConnected } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();

  if (!isConnected || !address) {
    // Prefer a wallet announced via EIP-6963 (e.g. MetaMask); fall back to window.ethereum.
    const connector = connectors.find((c) => c.id !== "injected") ?? connectors[0];
    return (
      <div className="flex flex-col items-end gap-1">
        <Button onClick={() => connect.mutate({ connector })} disabled={connect.isPending}>
          {connect.isPending ? "Connecting…" : "Connect wallet"}
        </Button>
        {connect.error && (
          <p className="text-xs text-red-600">
            {(connect.error as Error).name === "ProviderNotFoundError"
              ? "No browser wallet found. Install MetaMask."
              : (connect.error as BaseError).shortMessage ?? connect.error.message}
          </p>
        )}
      </div>
    );
  }

  if (chainId !== arc.id) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button onClick={() => switchChain.mutate({ chainId: arc.id })} disabled={switchChain.isPending}>
          {switchChain.isPending ? "Check wallet…" : "Switch to Arc"}
        </Button>
        {switchChain.error && (
          <p className="text-xs text-red-600">{(switchChain.error as BaseError).shortMessage}</p>
        )}
      </div>
    );
  }

  return (
    <Button variant="secondary" onClick={() => disconnect.mutate()} title="Disconnect">
      <span className="font-mono">{shortAddress(address)}</span>
    </Button>
  );
}
