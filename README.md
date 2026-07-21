# Multi-Chain Portfolio Explorer

Atlas is a demoable portfolio explorer for a 1-hour coding interview. It shows how to combine fragmented wallet and network balances into one clean holdings view while keeping the product architecture ready for live indexer providers later.

The app is local-first and backed by mocked data. Wallet connection, transaction history, historical charts, pagination, and watch lists are intentionally left out of the core implementation so the recommended requirements and UX states stay easy to verify.

For future work, start with [docs/HANDOFF.md](docs/HANDOFF.md), [docs/implementation-plan.md](docs/implementation-plan.md), and [docs/decisions.md](docs/decisions.md).

## What Is Implemented

- Unified holdings across seeded wallet/network targets.
- Token normalization with separate instance and canonical asset identities.
- Default grouping by token, with switchable network and wallet grouping.
- Search that filters positions before aggregation so visible totals match the search subset.
- Sortable grouped rows by value or portfolio percentage.
- Grouped total footer for the currently visible rows.
- Balance and price provenance on normalized positions, visible in expanded composition rows.
- Loading, empty, filtered-empty, partial-failure, total-error, and retry states.
- Expandable aggregate rows that show the child positions behind each total.
- Scenario URLs for deterministic demo and test coverage.

## Demo Scenarios

Start the local app and open one of these URLs:

- `http://localhost:3002/?scenario=normal`
- `http://localhost:3002/?scenario=partial`
- `http://localhost:3002/?scenario=empty`
- `http://localhost:3002/?scenario=error`

Scenario behavior:

- `normal`: all seeded Ethereum, Base, and Polygon targets return balances.
- `partial`: Base fails once, successful targets remain visible, and retry only reloads the failed target.
- `empty`: all targets succeed but return no balances.
- `error`: every target fails, showing the total-error state.

## Running Locally

Prerequisite: Node.js `>=22.13.0`.

```bash
npm install
npm run dev -- --port 3002
```

Fast checks:

```bash
npm run test:fast
```

Complete local regression:

```bash
npm test
```

The complete command runs the domain, runtime, component, and integration tests, then builds the production app and checks the rendered page smoke test.

## Architecture

The core is split into contracts, domain logic, runtime loading, and presentation:

- `lib/portfolio/contracts.ts`: shared types for providers, balances, normalized positions, grouped rows, summaries, failures, and scenarios.
- `lib/portfolio/networks.ts`: Ethereum, Base, and Polygon metadata.
- `lib/portfolio/domain/**`: asset identity, canonical registry, normalization, search, grouping, sorting, and summary selectors.
- `lib/portfolio/runtime/**`: fixture provider, seeded wallet targets, scenario behavior, concurrent loading, abort handling, and retry behavior.
- `hooks/usePortfolio.ts`: client hook that coordinates target loading and failed-target retry.
- `components/portfolio/**`: pure presentational UI for summaries, controls, tables, badges, and states.
- `app/PortfolioDashboard.tsx`: integration layer that wires scenario selection, runtime state, selectors, and UI.

This split keeps the interview story crisp: data acquisition can be swapped without rewriting grouping, and UI controls can switch grouping modes without changing provider code.

## Provenance

Each normalized position tracks both balance provenance and price provenance:

- `source.provider`: where the balance row came from.
- `source.providerAssetId`: the provider's token identifier, when available.
- `source.priceProvider`: where the USD price came from, or `null` when unavailable.
- `source.priceTimestamp`: optional timestamp for the price quote.

The mock provider defaults the price provider to the same provider that returned the balance. A live Zerion adapter could keep that same behavior, while a future mixed-source model could use Zerion for balances and a separate pricing provider for valuation.

## Asset Identity

The app uses two asset identities:

- `assetInstanceId`: the exact on-chain thing, generated from network plus contract address, or network plus native token.
- `canonicalAssetId`: the normalized asset used for token grouping.

Symbols are display-only. The app never merges by symbol because symbols collide and bridged or legacy variants can represent different assets.

Current static canonical registry:

- Native ETH on Ethereum and Base -> `asset:eth`
- Native POL on Polygon -> `asset:pol`
- Official USDC on Ethereum, Base, and Polygon -> `asset:usdc`

Unknown contracts get instance-derived canonical IDs, so same-symbol unknowns do not merge accidentally. This is why USDC and USDC.e stay separate unless a deliberate registry mapping says otherwise.

## Provider Policy

The core uses one authoritative balance provider per wallet/network target. In practice, that means a target such as `Main wallet on Base` gets one trusted quantity source. Zerion or Zapper can be added later, but the app should not blindly add both providers' balances for the same target because that would double count the same assets.

Future providers may enrich missing metadata or act as fallback sources, but multi-provider merging needs a separate deduplication and field-precedence decision first.

## Test Coverage

Current coverage is organized around the milestone boundaries:

- Domain tests verify normalization, canonical merging, same-symbol separation, grouping totals, search-before-aggregation, sorting, and unpriced assets.
- Runtime tests verify concurrent loading, partial failures, failed-only retry, fail-once recovery, empty versus error states, and abort handling.
- Component tests verify accessible controls, emitted changes, distinct UX states, partial warnings, unpriced labels, and expandable composition.
- Rendered-page smoke verifies product metadata and that starter messaging is gone.

## Known Limits

- Balances are mocked through `FixturePortfolioProvider`.
- Numeric quantities use JavaScript numbers for interview speed; live balances need a precision review before production use.
- Pricing is USD-only.
- Core networks are EVM-only: Ethereum, Base, and Polygon.
- Provider fixtures return `nextCursor: null`; the provider contract is cursor-ready, but pagination is not implemented yet.
- Wallet connection, transaction history, historical value charts, pagination UI, and watch lists are stretch work.

## Stretch Roadmap

Recommended order after the core suite passes:

1. Add USDC.e/bridged USDC and WETH mock edge cases.
2. Add a server-side Zerion adapter and provider pagination.
3. Add injected EVM wallet connection.
4. Add mocked 30-day portfolio history.
5. Add transaction history with its own model and provider.
6. Add a token watch list keyed by versioned canonical asset IDs.
7. Add Zapper as an alternative or fallback provider, not a source to blindly sum with Zerion.

## Reversal Points

The most expensive decisions to reverse are framework choice, asset identity policy, and persisted canonical IDs. The easiest decisions to reverse are fixture provider implementation, static registry internals, search order, default grouping, and expandable composition.

See [docs/decisions.md](docs/decisions.md) for the full decision record, reversal triggers, and migration notes.
