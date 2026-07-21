import styles from "./portfolio.module.css";
import type { PortfolioLoadingSkeletonProps } from "./types";
export function PortfolioLoadingSkeleton({ rowCount = 5 }: PortfolioLoadingSkeletonProps) {
  return <section className={styles.loading} aria-label="Loading portfolio" aria-live="polite" aria-busy="true"><span className={styles.srOnly}>Loading portfolio balances</span><div className={styles.skeletonSummary} aria-hidden="true"><span /><span /><span /></div><div className={styles.skeletonTable} aria-hidden="true">{Array.from({ length: Math.max(1, rowCount) }, (_, index) => <div className={styles.skeletonRow} key={`skeleton-row-${index}`}><span /><span /><span /><span /></div>)}</div></section>;
}
