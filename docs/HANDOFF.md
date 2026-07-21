# Engineering Handoff

## Current State

Atlas is a local-first multi-chain portfolio explorer. It uses mocked balances across seeded wallet/network targets and turns fragmented source data into a normalized portfolio view grouped by token, network, or wallet.

The core recommended requirements are implemented:

- Combine balances across multiple wallets and networks.
- Normalize token identity with chain-scoped instance IDs and canonical asset IDs.
- Avoid symbol-only token merging.
- Group by token, network, or wallet through one selector path.
- Search before aggregation so displayed totals match the filtered subset.
- Show loading, empty, filtered-empty, partial-failure, total-error, and retry states.
- Display grouped totals, sortable value/portfolio columns, expandable row composition, balance provenance, and price provenance.

Stretch features are intentionally not implemented yet: live provider adapters, wallet connection, transaction history, portfolio history, pagination UI, and watch lists.

## Primary Documents

- [../README.md](../README.md): setup, scenario URLs, architecture overview, test commands, and known limits.
- [implementation-plan.md](implementation-plan.md): milestone plan, gates, and parallel-agent ownership.
- [decisions.md](decisions.md): accepted/deferred decisions with rationale, reversibility, reversal triggers, and migration notes.
- [../lib/portfolio/contracts.ts](../lib/portfolio/contracts.ts): shared contracts that future providers and UI should preserve.

## Important Code Paths

- `app/PortfolioDashboard.tsx`: wires scenario selection, loading state, search, grouping, and presentation.
- `components/portfolio/**`: pure portfolio UI components and component tests.
- `hooks/usePortfolio.ts`: target loading, abort handling, and failed-target retry.
- `lib/portfolio/domain/**`: identity, registry lookup, normalization, search, grouping, totals, and sorting.
- `lib/portfolio/runtime/**`: mocked provider, seeded targets, deterministic scenarios, pagination-ready loader, and runtime tests.
- `tests/rendered-html.test.mjs`: product smoke test that verifies rendered metadata and starter removal.

## Current Mock Data

Seeded wallet/network targets:

- Main wallet on Ethereum
- Main wallet on Base
- Trading wallet on Polygon

Mocked assets:

- Ethereum: ETH, official USDC, UNI
- Base: ETH, official USDC, AERO
- Polygon: POL, official USDC, LINK, unpriced legacy MATIC

The unpriced MATIC exists to prove incomplete valuation behavior. The Base target fails once in the `partial` scenario to prove partial-failure and failed-only retry behavior.

## Asset Identity Rules

The app separates:

- `assetInstanceId`: exact on-chain identity, based on network plus contract address or native asset.
- `canonicalAssetId`: normalized identity used for token grouping.

Current registry mappings:

- Native ETH on Ethereum and Base -> `asset:eth`
- Native POL on Polygon -> `asset:pol`
- Official USDC on Ethereum, Base, and Polygon -> `asset:usdc`

Unknown contracts receive instance-derived canonical IDs. Do not merge by symbol.

## Validation Status

Latest local validation from `/Users/eugenia/CodexProjects/Multi-Chain-Portfolio-Explorer`:

- `npm test`
- 5 test files passed.
- 34 tests passed.
- Production build passed.
- Rendered-page smoke passed.

## Public Repo Safety Notes

- No `.env` files are required or committed.
- No API keys, private keys, seed phrases, or real wallet credentials are present.
- Wallet addresses are mocked public-looking addresses.
- Balances and prices are mocked.
- Generated outputs are ignored: `node_modules`, `build`, `dist`, `.vinext`, `.wrangler`, and `tsconfig.tsbuildinfo`.
- `.openai/hosting.json` only contains null D1/R2 placeholders.

## Recommended Follow-Ups

### P0: Keep The Public Handoff Clean

- Push only the committed main project folder.
- Do not commit `node_modules`, build outputs, `.env`, or local logs.
- After pushing, check GitHub's file list and confirm `docs/HANDOFF.md`, `README.md`, and `docs/decisions.md` render correctly.

### P1: Add The Two Best Mock Edge Cases

Add two mocked assets:

- `USDC.e` or bridged USDC to prove official USDC and bridged USDC do not merge by symbol.
- `WETH` to prove native ETH and wrapped ETH stay separate.

Add tests covering both behaviors and update the mock-data notes in `README.md`.

### P2: Add A Server-Side Zerion Adapter

Use the existing `PortfolioProvider` interface. Keep credentials server-side and keep `FixturePortfolioProvider` as the deterministic test provider.

Implementation notes:

- Map Zerion chain IDs to `eip155:*` network IDs.
- Convert Zerion wallet fungible positions into `RawBalance`.
- Follow pagination cursors until complete.
- Preserve balance and price provenance.
- Do not combine Zerion and Zapper balances for the same wallet/network target without a deduplication policy.

Before accepting live data, perform the numeric-precision review from decision D-015.

### P3: Add Wallet Connection

Convert connected EVM addresses and selected networks into existing `WalletTarget` records. Keep wallet connection isolated from normalization, grouping, and provider logic.

Do not couple wallet libraries directly to table or selector components.

### P4: Add History And Transactions As Separate Models

Do not overload `NormalizedPosition`.

- Portfolio history should use a separate `PortfolioPoint` model and view.
- Transaction history should use a dedicated transaction provider/model with cursor pagination.

### P5: Add Watch List Carefully

If watch lists persist to local storage, use versioned canonical asset IDs. Document the storage version and migration strategy before shipping persistence.

## Decisions That Are Hard To Reverse

Review [decisions.md](decisions.md) before changing these:

- Framework/runtime choice.
- Instance ID plus canonical asset ID policy.
- One authoritative balance provider per wallet/network target.
- Canonical IDs as persisted watch-list keys once watch lists exist.
- Numeric representation after live balances are accepted.

## If Something Breaks

Start with:

```bash
npm run test:fast
npm test
```

Likely failure locations:

- Scenario or retry regressions: `hooks/usePortfolio.ts`, `lib/portfolio/runtime/**`, `app/PortfolioDashboard.test.tsx`
- Token grouping regressions: `lib/portfolio/domain/**`
- UI state regressions: `components/portfolio/**`
- Render/build regressions: `tests/rendered-html.test.mjs`, `app/layout.tsx`, `app/page.tsx`
