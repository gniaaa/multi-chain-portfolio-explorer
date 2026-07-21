"use client";

import { useEffect, useMemo, useState } from "react";

import {
  GroupByControl,
  PortfolioEmptyState,
  PortfolioFilteredEmptyState,
  PortfolioLoadingSkeleton,
  PortfolioPartialWarning,
  PortfolioSearch,
  PortfolioSummary,
  PortfolioTable,
  PortfolioTotalError,
  WalletSummary,
  type PortfolioWalletSummaryViewModel,
} from "@/components/portfolio";
import { usePortfolio } from "@/hooks/usePortfolio";
import type {
  GroupBy,
  PortfolioScenario,
  RequestFailureViewModel,
} from "@/lib/portfolio/contracts";
import {
  groupPositions,
  selectPortfolioRows,
  summarizePortfolio,
} from "@/lib/portfolio/domain";
import { getNetwork } from "@/lib/portfolio/networks";

import styles from "./portfolio-shell.module.css";

const VALID_SCENARIOS = new Set<PortfolioScenario>([
  "normal",
  "partial",
  "empty",
  "error",
]);

function scenarioFromLocation(): PortfolioScenario {
  if (typeof window === "undefined") return "normal";
  const requested = new URLSearchParams(window.location.search).get("scenario");
  return requested && VALID_SCENARIOS.has(requested as PortfolioScenario)
    ? (requested as PortfolioScenario)
    : "normal";
}

export function PortfolioDashboard() {
  const [groupBy, setGroupBy] = useState<GroupBy>("token");
  const [searchQuery, setSearchQuery] = useState("");
  const [scenario, setScenario] = useState<PortfolioScenario>("normal");

  useEffect(() => {
    function syncScenarioFromLocation() {
      setScenario(scenarioFromLocation());
    }

    syncScenarioFromLocation();
    window.addEventListener("popstate", syncScenarioFromLocation);

    return () => {
      window.removeEventListener("popstate", syncScenarioFromLocation);
    };
  }, []);
  const { state, retryFailed } = usePortfolio({ scenario });

  const failures = useMemo<RequestFailureViewModel[]>(
    () =>
      Object.values(state.targets)
        .filter((targetState) => targetState.phase === "error")
        .map((targetState) => ({
          targetId: targetState.target.id,
          walletLabel: targetState.target.walletLabel,
          networkLabel: getNetwork(targetState.target.networkId).name,
          message:
            targetState.errorMessage ??
            "Unable to load this wallet and network.",
        })),
    [state.targets],
  );

  const hasIncompleteTargets = Object.values(state.targets).some(
    (targetState) => targetState.phase !== "success",
  );
  const baseSummary = summarizePortfolio(state.positions);
  const summary = {
    ...baseSummary,
    isIncomplete: baseSummary.isIncomplete || hasIncompleteTargets,
  };
  const rows = selectPortfolioRows({
    positions: state.positions,
    groupBy,
    searchQuery,
  });

  const wallets = useMemo<PortfolioWalletSummaryViewModel[]>(() => {
    const walletRows = groupPositions(state.positions, "wallet");

    return walletRows.map((row) => {
      const firstPosition = row.positions[0];
      const targetFailed = Object.values(state.targets).some(
        (targetState) =>
          targetState.target.walletId === row.id &&
          targetState.phase !== "success",
      );

      return {
        id: row.id,
        label: row.label,
        address: firstPosition?.walletAddress ?? "",
        totalValueUsd: row.valueUsd,
        assetCount: row.assetCount,
        networkCount: row.networkCount,
        isIncomplete: row.hasUnpricedPositions || targetFailed,
      };
    });
  }, [state.positions, state.targets]);

  const allTargetsFailed =
    state.hasLoaded &&
    failures.length > 0 &&
    failures.length === Object.keys(state.targets).length;
  const isInitialOrTotalRetry =
    !state.hasLoaded || (state.isLoading && state.positions.length === 0);
  const isTrueEmpty =
    state.hasLoaded && state.positions.length === 0 && failures.length === 0;
  const isFilteredEmpty =
    state.positions.length > 0 && searchQuery.trim().length > 0 && rows.length === 0;

  return (
    <main className={styles.pageShell}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/" aria-label="Atlas portfolio home">
          <span className={styles.brandMark} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            <strong>Atlas</strong>
            <small>Multi-chain portfolio</small>
          </span>
        </a>
        <div className={styles.dataStatus}>
          <span className={styles.statusDot} aria-hidden="true" />
          Mocked data · {scenario} scenario
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.intro} aria-labelledby="portfolio-heading">
          <div>
            <p className={styles.kicker}>Unified holdings</p>
            <h1 id="portfolio-heading">Your portfolio, without the chain switching.</h1>
            <p>
              One trusted view across wallets and networks, normalized down to
              the contract.
            </p>
          </div>
          <span className={styles.scopeBadge}>Ethereum · Base · Polygon</span>
        </section>

        {isInitialOrTotalRetry ? (
          <PortfolioLoadingSkeleton rowCount={6} />
        ) : allTargetsFailed ? (
          <PortfolioTotalError
            failures={failures}
            isRetrying={state.isLoading}
            onRetry={retryFailed}
          />
        ) : isTrueEmpty ? (
          <PortfolioEmptyState
            title="These wallets are ready"
            description="No supported token balances were returned. Add assets or try another demo scenario."
          />
        ) : (
          <>
            <PortfolioSummary summary={summary} />

            {failures.length > 0 && (
              <PortfolioPartialWarning
                failures={failures}
                isRetrying={state.isLoading}
                onRetry={retryFailed}
              />
            )}

            <WalletSummary wallets={wallets} />

            <section className={styles.holdingsSection} aria-labelledby="holdings-heading">
              <div className={styles.holdingsHeading}>
                <div>
                  <p className={styles.kicker}>Breakdown</p>
                  <h2 id="holdings-heading">Holdings</h2>
                </div>
                <GroupByControl onChange={setGroupBy} value={groupBy} />
              </div>

              <div className={styles.toolbar}>
                <PortfolioSearch
                  onChange={setSearchQuery}
                  resultCount={rows.length}
                  value={searchQuery}
                />
                <p>
                  Search filters positions before totals are calculated.
                </p>
              </div>

              {isFilteredEmpty ? (
                <PortfolioFilteredEmptyState
                  onClear={() => setSearchQuery("")}
                  query={searchQuery}
                />
              ) : (
                <PortfolioTable
                  caption={`Portfolio grouped by ${groupBy}`}
                  groupBy={groupBy}
                  rows={rows}
                />
              )}
            </section>
          </>
        )}

        <footer className={styles.footer}>
          <p>
            Token identity uses chain + contract first, then a verified canonical
            mapping. Symbols are display-only.
          </p>
          <nav aria-label="Demo scenarios">
            <a href="/?scenario=normal">Normal</a>
            <a href="/?scenario=partial">Partial failure</a>
            <a href="/?scenario=empty">Empty</a>
            <a href="/?scenario=error">Total error</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
