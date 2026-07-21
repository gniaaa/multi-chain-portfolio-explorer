"use client";
import styles from "./portfolio.module.css";
import type { PortfolioSearchProps } from "./types";

export function PortfolioSearch({ value, onChange, resultCount }: PortfolioSearchProps) {
  return <div className={styles.searchWrap}>
    <label className={styles.srOnly} htmlFor="portfolio-search">Search portfolio</label>
    <span className={styles.searchIcon} aria-hidden="true">⌕</span>
    <input className={styles.searchInput} id="portfolio-search" onChange={(event) => onChange(event.currentTarget.value)} placeholder="Search assets, networks, or wallets" type="search" value={value} />
    {resultCount !== undefined && <span className={styles.resultCount} aria-live="polite">{pluralizeResult(resultCount)}</span>}
  </div>;
}
const pluralizeResult = (count: number) => `${count} ${count === 1 ? "result" : "results"}`;
