import Image from "next/image";
import { Circle } from "@/components/Circle";
import { ConnectButton } from "@/components/ConnectButton";
import { Card } from "@/components/ui";
import { DEFAULT_AJO_ADDRESS } from "@/lib/ajo";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/links-icon-512.png" alt="" width={44} height={44} priority />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Links</h1>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">savings circles on Arc</p>
          </div>
        </div>
        <ConnectButton />
      </header>

      <p className="mb-6 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        An ajo (or esusu) is a rotating savings circle: everyone puts in the same amount each round, and one
        member takes the whole pot, until everyone has had a turn. Here the pot is held in USDC by a contract and paid
        out automatically.
      </p>

      {DEFAULT_AJO_ADDRESS ? (
        <Circle address={DEFAULT_AJO_ADDRESS} />
      ) : (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No circle configured. Set <code className="font-mono">NEXT_PUBLIC_AJO_ADDRESS</code> to a deployed Ajo
            contract.
          </p>
        </Card>
      )}
    </main>
  );
}
