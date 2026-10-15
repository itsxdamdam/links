import { createConfig, http, injected } from "wagmi";
import { arc } from "@/lib/chain";

export const config = createConfig({
  chains: [arc],
  connectors: [injected()],
  transports: { [arc.id]: http() },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
