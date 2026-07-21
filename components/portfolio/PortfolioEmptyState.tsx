import styles from "./portfolio.module.css";
import type { PortfolioEmptyStateProps } from "./types";
export function PortfolioEmptyState({ title = "No assets found", description = "These wallets do not have any supported assets yet." }: PortfolioEmptyStateProps) {
  return <section className={styles.emptyState} aria-labelledby="portfolio-empty-title"><span className={styles.emptyIcon} aria-hidden="true">0</span><h2 id="portfolio-empty-title">{title}</h2><p>{description}</p></section>;
}
