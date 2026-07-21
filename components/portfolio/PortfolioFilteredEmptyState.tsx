"use client";
import styles from "./portfolio.module.css";
import type { PortfolioFilteredEmptyStateProps } from "./types";
export function PortfolioFilteredEmptyState({ query, onClear }: PortfolioFilteredEmptyStateProps) {
  return <section className={styles.emptyState} aria-labelledby="portfolio-filtered-empty-title"><span className={styles.emptyIcon} aria-hidden="true">?</span><h2 id="portfolio-filtered-empty-title">No matching assets</h2><p>No holdings match <strong>“{query}”</strong>. Try another search or clear the filter.</p><button className={styles.secondaryButton} onClick={onClear} type="button">Clear search</button></section>;
}
