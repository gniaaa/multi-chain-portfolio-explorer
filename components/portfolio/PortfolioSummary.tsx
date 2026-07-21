import { formatUsd, pluralize } from "./format";
import styles from "./portfolio.module.css";
import type { PortfolioSummaryProps } from "./types";

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  return <section className={styles.summaryCard} aria-labelledby="portfolio-total-label">
    <p className={styles.eyebrow} id="portfolio-total-label">Total portfolio value</p>
    <p className={styles.totalValue}>{formatUsd(summary.totalValueUsd)}</p>
    <div className={styles.summaryMeta}>
      <span>{pluralize(summary.pricedPositionCount, "priced position")}</span>
      {summary.unpricedPositionCount > 0 && <span>{pluralize(summary.unpricedPositionCount, "unpriced position")}</span>}
      <span className={summary.isIncomplete ? styles.incomplete : styles.complete}>{summary.isIncomplete ? "Partial total" : "Complete total"}</span>
    </div>
    {summary.isIncomplete && <p className={styles.helpText}>The total excludes unpriced assets and unavailable balances.</p>}
  </section>;
}
