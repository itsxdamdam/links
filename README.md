# Links — savings circles on Arc

An onchain **ajo / esusu** (rotating savings circle) on Arc mainnet. A fixed group of members each put the same amount of USDC in every round. When the last member pays, the contract sends the whole pot to that round's recipient automatically. The rotation keeps going until everyone has received once.

- **Contract (Arc mainnet):** [`0x084AFB68e70C6d71d9aE101F71d3185457CaB3e7`](https://explorer.arc.io/address/0x084AFB68e70C6d71d9aE101F71d3185457CaB3e7)
- **Deploy tx:** [`0x99be1eb188b850206504a871d0017495d76a4cfa52970af529c398c03b60eee6`](https://explorer.arc.io/tx/0x99be1eb188b850206504a871d0017495d76a4cfa52970af529c398c03b60eee6)
- **Round 1 payout tx:** `0x…` <!-- TEMP: fill after round 1 -->
- **Live app:** https://links-beta-cyan.vercel.app

## Why

Ajo/esusu is how millions of Nigerians save. You join a circle you trust, contribute every week or month, and on your turn you collect the whole pot. It works, but everything depends on the person holding the money. Links makes the pot transparent and the payout automatic: the funds sit in a contract anyone can inspect, in USDC on Arc, and nobody can hold the pot back or run off with it.

## How it works

`contracts/src/Ajo.sol`, constructor `(usdc, members[], contribution)`:

- `contribute()`: a member pays `contribution` for the current round, once per round. When the last member pays, `round` advances and `contribution × members.length` goes to `members[round]` in the same transaction.
- Views: `getMembers()`, `currentRecipient()` (returns `address(0)` once the cycle is done), `getPaidStatus()`, `paid(round, member)`, `payoutBlock(round)`.
- Events: `Contributed(round, member)`, `PaidOut(round, recipient, amount)`.
- There's no owner, no admin and no withdraw function.

Amounts use USDC's ERC-20 units (**6 decimals**, so `100000` = 0.1 USDC). Arc's native gas token is also USDC, but at **18 decimals**.

### Known limitations

- Members are trusted to keep paying. If someone stops, the round never completes and the earlier contributions for that round stay locked. There's no timeout or exit.
- If a recipient can't receive USDC (for example, a blocklisted address), the final contribution of that round reverts, and the round stalls the same way.

## Repo layout

```
contracts/   Foundry: Ajo.sol, tests, deploy script
web/         Next.js (App Router) + TypeScript + Tailwind + wagmi + viem
```

## Run it

### Contracts

```bash
cd contracts
forge test                         # unit tests with a mock 6-decimal USDC

cp .env.example .env               # set PRIVATE_KEY, MEMBERS (comma-separated), CONTRIBUTION
source .env
forge script script/Deploy.s.sol --rpc-url $RPC --broadcast
# add --legacy if gas estimation fails
```

### One round from the CLI

Each member approves and then contributes. `--interactive` prompts for the key so it never lands in your shell history.

```bash
RPC=https://rpc.mainnet.arc.io
AJO=0x084AFB68e70C6d71d9aE101F71d3185457CaB3e7
USDC=0x3600000000000000000000000000000000000000

cast send $USDC "approve(address,uint256)" $AJO 100000 --rpc-url $RPC --interactive
cast send $AJO "contribute()" --rpc-url $RPC --interactive

# check state
cast call $AJO "round()(uint256)" --rpc-url $RPC
cast call $AJO "getPaidStatus()(bool[])" --rpc-url $RPC
```

### Web

```bash
cd web
cp .env.example .env.local         # NEXT_PUBLIC_AJO_ADDRESS=0x…
npm install
npm run dev                        # http://localhost:3000
```

### Deploy the web app to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project** and import the repo.
3. Set **Root Directory** to `web`. Vercel detects Next.js and fills in the build settings.
4. Under **Environment Variables**, add `NEXT_PUBLIC_AJO_ADDRESS` = the deployed contract address.
5. Click **Deploy**.

Or from the CLI: `cd web && npx vercel --prod`, and add the env var when prompted, or set it first with `npx vercel env add NEXT_PUBLIC_AJO_ADDRESS production`.

`NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing the address.

## Network

| | |
|---|---|
| Chain ID | 5042 |
| RPC | https://rpc.mainnet.arc.io |
| Explorer | https://explorer.arc.io |
| USDC (ERC-20, 6 dp) | `0x3600000000000000000000000000000000000000` |
