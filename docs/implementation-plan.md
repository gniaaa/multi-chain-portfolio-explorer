# Implementation Plan

This document preserves the build plan and parallel-agent ownership history. It is separate from:

- [HANDOFF.md](HANDOFF.md), which describes current engineering state and next steps.
- [decisions.md](decisions.md), which records explicit product/architecture decisions and reversibility.

## Milestone Status

The project was implemented in strict, testable milestones. Later milestones were blocked until earlier gates passed.

| Milestone | Status | Outcome |
| --- | --- | --- |
| 0. Bootstrap | Complete | Preserved the starter until the baseline app, dev server, test setup, and production build were healthy. |
| 1. Contracts and decisions | Complete | Froze shared portfolio contracts, Ethereum/Base/Polygon metadata, and the decision log before product work. |
| 2. Parallel core construction | Complete | Built domain logic, runtime loading, and presentational UI in separate ownership lanes. |
| 3. Integration | Complete | Wired mocked provider -> normalization -> search -> grouping -> portfolio UI and scenario URLs. |
| 4. Acceptance suite | Complete | Added full regression coverage, production build, and rendered-page smoke checks. |
| 5. Group composition | Complete | Added expandable aggregate rows with child positions and provenance details. |
| 6. Stretch roadmap | Deferred | Live providers, wallet connection, history, transactions, pagination UI, and watch lists remain follow-ups. |

## Parallel-Agent Ownership

Parallel work started only after shared contracts and network metadata were frozen.

| Owner | Exclusive Scope | Delivered |
| --- | --- | --- |
| Domain agent | `lib/portfolio/domain/**` | Asset instance IDs, canonical registry, normalization, search, grouping, sorting, totals, unpriced handling, and domain tests. |
| Runtime agent | `lib/portfolio/runtime/**`, `hooks/usePortfolio.ts` | Mocked provider scenarios, seeded targets, concurrent loading, partial failure, failed-only retry, cursor-ready loading, abort handling, and runtime/hook tests. |
| UI agent | `components/portfolio/**` | Pure portfolio components, state panels, grouped table, accessible controls, expandable composition, provenance display, and component tests. |
| Primary agent | Shared contracts, app entrypoints, docs, decisions, integration, final tests | Contract freeze, app wiring, scenario URLs, README/handoff/decision docs, public-repo cleanup, and complete regression verification. |

## Integration Rules Used

- Agents did not edit shared contracts after Milestone 1 without primary ownership.
- Agents avoided `package.json`, lockfiles, app entrypoints, README, and decision log.
- New cross-cutting decisions were handled by the primary owner.
- Integration happened after scoped suites passed independently.
- Final verification included domain, runtime, hook, component, page, build, and rendered-page smoke tests.

## Future Parallelization Guidance

Use the same ownership split for future work when possible:

- Domain changes: asset identity, canonical registry, selectors, totals, precision, and grouping behavior.
- Runtime changes: provider adapters, pagination, loading states, retry, abort, and target orchestration.
- UI changes: controls, tables, panels, composition, accessibility, and visual presentation.
- Primary changes: shared contracts, storage policy, app integration, provider switching, docs, and final regression.

Do not parallelize framework changes, canonical identity policy, shared contract changes, storage-version policy, or final integration. Those are cross-cutting and should stay with one primary owner.

## Stretch Implementation Order

1. Add USDC.e/bridged USDC and WETH mock edge cases.
2. Add a server-side Zerion adapter and provider pagination.
3. Add injected EVM wallet connection.
4. Add mocked 30-day portfolio history.
5. Add transaction history with its own model and provider.
6. Add a token watch list keyed by versioned canonical asset IDs.
7. Add Zapper as an alternative or fallback provider, not a source to blindly sum with Zerion.

Run the full core suite before and after each stretch.
