# Robinhood Chain Launchpad

Frontend test assignment: token list + bonding curve buy on Robinhood Chain Testnet.

## Stack
- Next.js 16 + React + TypeScript
- wagmi + viem
- Tailwind CSS

## Run
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

Production:
```bash
npm run build
npm start
```

## Network
- Chain ID: 46630
- RPC: https://robinhood-sepolia-rpc.publicnode.com
- Explorer: https://explorer.testnet.chain.robinhood.com
- Factory: 0x533cE670f1372cb402D49866608b92e7bc2b4493
- Multicall3: 0xcA11bde05977b3631167028862bE2a173976CA11
- Factory deployment block: 129157568

## Technical decisions
- `eth_getLogs` is chunked at 50,000 blocks because the public RPC rejects larger ranges.
- Token list is discovered from `TokenLaunched`, not hardcoded, and refreshed every 30 seconds plus manually.
- Per-token reads are batched through Multicall3 `aggregate3` with `allowFailure=true`.
- Bonding-curve math stays in `bigint`; user ETH is parsed with `parseEther` and values are never converted to Number for calculations.
- Spot price and graduation progress are derived from raw on-chain reserves.
- Buy sends `quoteIn` as `msg.value` and uses the wallet address as recipient.
- Transaction UX distinguishes wallet confirmation, pending, success, rejection, slippage, graduation, and generic failure.
- After a successful buy, token list, wallet ETH balance, and selected token balance are refreshed without page reload.

## Notes / limitations
- This implementation focuses on core steps 1–9 of the brief. The optional launch-token bonus UI is intentionally omitted from the core flow to keep the submission focused on the required trading path.
- Logos are loaded from the token's `logo()` string with a placeholder fallback.
- The implementation currently displays all launched tokens, including non-ETH pair tokens; the buy form is intended for the ETH curves described in the assignment.
- Demo screenshots/video should be added under `/demo` before submission.

## AI assistance
AI was used to accelerate scaffolding, ABI wiring, UI implementation, and review. Contract addresses and ABI definitions come from the supplied assignment materials.


## Bonus: Launch Token

The UI includes the main bonus flow from the brief:
- Launch config `1` with `pairToken = address(0)`
- Token name max 64 chars and symbol max 16 chars
- Default ticker `TEST`
- Reads `launchFee()` and sends the exact value
- Reads `previewLaunchEconomics(1, address(0))` immediately before the transaction
- Generates a fresh random 32-byte salt for every attempt
- Calls the 3-argument `launchToken(TokenParams,uint256,address)` overload
- Uses the connected wallet as `creatorFeeRecipient`
- After success, refreshes the event-derived token list so the new token appears without changing code and can be bought through the same buy form

If the factory rejects `canLaunch(address)`, tell the supervisor; the brief explicitly allows the supervisor to enable the test wallet.
