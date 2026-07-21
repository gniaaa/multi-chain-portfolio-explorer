"use client";
import { pluralize } from "./format";
import styles from "./portfolio.module.css";
import type { PortfolioPartialWarningProps } from "./types";
export function PortfolioPartialWarning({ failures, onRetry, isRetrying = false }: PortfolioPartialWarningProps) {
  return <section className={styles.warning} role="status" aria-live="polite"><div><h2>Some balances are unavailable</h2><p>Showing the balances we could load. The portfolio total is partial because {pluralize(failures.length, "request")} failed.</p><ul className={styles.failureList}>{failures.map((failure) => <li key={failure.targetId}><strong>{failure.walletLabel}</strong><span> on {failure.networkLabel}</span><span className={styles.srOnly}>: {failure.message}</span></li>)}</ul></div><button className={styles.retryButton} disabled={isRetrying} onClick={onRetry} type="button">{isRetrying ? "Retrying…" : "Retry unavailable balances"}</button></section>;
}
