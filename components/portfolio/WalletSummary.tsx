import { formatUsd, pluralize, shortenAddress } from "./format";
import styles from "./portfolio.module.css";
import type { WalletSummaryProps } from "./types";

export function WalletSummary({ wallets }: WalletSummaryProps) {
  return <section aria-labelledby="wallet-summary-title">
    <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Accounts</p><h2 id="wallet-summary-title">Wallet summary</h2></div><span className={styles.muted}>{pluralize(wallets.length, "wallet")}</span></div>
    <div className={styles.walletGrid}>{wallets.map((wallet) => <article className={styles.walletCard} key={wallet.id}>
      <div className={styles.walletHeading}><div><h3>{wallet.label}</h3><span className={styles.mono} title={wallet.address}>{shortenAddress(wallet.address)}</span></div>{wallet.isIncomplete && <span className={styles.incomplete} title="Some assets are missing prices, so this wallet total excludes them.">Value incomplete</span>}</div>
      <p className={styles.walletValue}>{formatUsd(wallet.totalValueUsd)}</p>
      <p className={styles.walletMeta}>{pluralize(wallet.assetCount, "asset")} · {pluralize(wallet.networkCount, "network")}</p>
    </article>)}</div>
  </section>;
}
