import styles from "./portfolio.module.css";
import type { ProvenanceBadgeProps } from "./types";
export function ProvenanceBadge({ provider, providerAssetId }: ProvenanceBadgeProps) {
  const detail = providerAssetId ? `Data from ${provider}, provider asset ${providerAssetId}` : `Data from ${provider}`;
  return <span className={styles.provenance} title={detail} aria-label={detail}><span aria-hidden="true">✓</span>{provider}</span>;
}
