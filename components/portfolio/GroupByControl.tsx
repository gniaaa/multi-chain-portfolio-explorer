"use client";
import type { GroupBy } from "@/lib/portfolio/contracts";
import styles from "./portfolio.module.css";
import type { GroupByControlProps } from "./types";

const options = [{ value: "token", label: "Token" }, { value: "network", label: "Network" }, { value: "wallet", label: "Wallet" }] as const satisfies readonly { value: GroupBy; label: string }[];
export function GroupByControl({ value, onChange }: GroupByControlProps) {
  return <fieldset className={styles.groupControl}><legend className={styles.srOnly}>Group portfolio by</legend>{options.map((option) => <button aria-pressed={value === option.value} className={styles.groupButton} key={option.value} onClick={() => onChange(option.value)} type="button">{option.label}</button>)}</fieldset>;
}
