"use client";
import { pluralize } from "./format";
import styles from "./portfolio.module.css";
import type { PortfolioTotalErrorProps } from "./types";
export function PortfolioTotalError({ failures, onRetry, isRetrying = false }: PortfolioTotalErrorProps) {
  return <section className={styles.totalError} role="alert"><span className={styles.errorIcon} aria-hidden="true">!</span><h2>Portfolio could not be loaded</h2><p>{pluralize(failures.length, "balance request")} failed. Your wallets and settings are safe.</p>{failures.length > 0 && <ul className={styles.failureList}>{failures.map((failure) => <li key={failure.targetId}><strong>{failure.walletLabel}</strong><span> on {failure.networkLabel}: {failure.message}</span></li>)}</ul>}<button className={styles.retryButton} disabled={isRetrying} onClick={onRetry} type="button">{isRetrying ? "Retrying…" : "Retry loading portfolio"}</button></section>;
}
