"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  GroupBy,
  GroupedPortfolioRow,
  NormalizedPosition,
} from "@/lib/portfolio/contracts";
import { getNetwork } from "@/lib/portfolio/networks";
import {
  formatPercent,
  formatQuantity,
  formatUsd,
  pluralize,
  shortenAddress,
} from "./format";
import { ProvenanceBadge } from "./ProvenanceBadge";
import detailStyles from "./portfolio-details.module.css";
import styles from "./portfolio.module.css";
import controlStyles from "./portfolio-table-controls.module.css";
import type { PortfolioTableProps } from "./types";

type SortKey = "value" | "portfolio";
type SortDirection = "asc" | "desc";

export function PortfolioTable({
  rows,
  groupBy,
  caption = "Portfolio holdings",
}: PortfolioTableProps) {
  const [expandedRows, setExpandedRows] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({ key: "value", direction: "desc" });

  useEffect(() => {
    const availableRows = new Set(rows.map((row) => row.id));
    setExpandedRows((current) => {
      const next = new Set(
        [...current].filter((rowId) => availableRows.has(rowId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const leftValue =
          sort.key === "value" ? left.valueUsd : left.portfolioPercent;
        const rightValue =
          sort.key === "value" ? right.valueUsd : right.portfolioPercent;
        const numericOrder =
          sort.direction === "desc"
            ? rightValue - leftValue
            : leftValue - rightValue;

        return (
          numericOrder ||
          left.label.localeCompare(right.label) ||
          left.id.localeCompare(right.id)
        );
      }),
    [rows, sort],
  );
  const totals = useMemo(
    () => ({
      valueUsd: rows.reduce((total, row) => total + row.valueUsd, 0),
      portfolioPercent: rows.reduce(
        (total, row) => total + row.portfolioPercent,
        0,
      ),
      positionCount: rows.reduce((total, row) => total + row.positionCount, 0),
    }),
    [rows],
  );

  function toggleRow(rowId: string) {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function updateSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  return (
    <div className={styles.tableFrame}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              {groupBy === "token"
                ? "Token"
                : groupBy === "network"
                  ? "Network"
                  : "Wallet"}
            </th>
            <th scope="col">Quantity</th>
            <th
              aria-sort={
                sort.key === "value"
                  ? sort.direction === "desc"
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              scope="col"
            >
              <SortButton
                active={sort.key === "value"}
                direction={sort.direction}
                label="Value"
                onClick={() => updateSort("value")}
              />
            </th>
            <th
              aria-sort={
                sort.key === "portfolio"
                  ? sort.direction === "desc"
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              scope="col"
            >
              <SortButton
                active={sort.key === "portfolio"}
                direction={sort.direction}
                label="Portfolio"
                onClick={() => updateSort("portfolio")}
              />
            </th>
            <th scope="col">Coverage</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => {
            const isExpanded = expandedRows.has(row.id);
            const detailId = `portfolio-composition-${safeDomId(row.id)}`;

            return (
              <PortfolioRow
                detailId={detailId}
                groupBy={groupBy}
                isExpanded={isExpanded}
                key={row.id}
                onToggle={() => toggleRow(row.id)}
                row={row}
              />
            );
          })}
        </tbody>
        <tfoot className={controlStyles.totalFooter}>
          <tr>
            <th scope="row">
              Grouped total
              <span className={styles.rowCounts}>
                {pluralize(rows.length, "group")} shown
              </span>
            </th>
            <td className={styles.numeric}>
              <span className={styles.notApplicable} aria-label="Mixed quantities">
                -
              </span>
            </td>
            <td className={styles.numeric}>{formatUsd(totals.valueUsd)}</td>
            <td className={styles.numeric}>
              {formatPercent(Math.min(totals.portfolioPercent, 100))}
            </td>
            <td>
              <span className={styles.coverage}>
                {pluralize(totals.positionCount, "position")}
              </span>
            </td>
            <td>
              <span className={styles.notApplicable}>Filtered view</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SortButton({
  active,
  direction,
  label,
  onClick,
}: {
  readonly active: boolean;
  readonly direction: SortDirection;
  readonly label: string;
  readonly onClick: () => void;
}) {
  const nextDirection = active && direction === "desc" ? "ascending" : "descending";

  return (
    <button
      aria-label={`Sort by ${label.toLowerCase()} ${nextDirection}`}
      className={controlStyles.sortButton}
      onClick={onClick}
      type="button"
    >
      {label}
      <span aria-hidden="true">
        {active && direction === "asc" ? "^" : "v"}
      </span>
    </button>
  );
}

function PortfolioRow({
  detailId,
  groupBy,
  isExpanded,
  onToggle,
  row,
}: {
  readonly detailId: string;
  readonly groupBy: GroupBy;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly row: Readonly<GroupedPortfolioRow>;
}) {
  const providers = [
    ...new Set(row.positions.map((position) => position.source.provider)),
  ];
  const counts =
    groupBy === "token"
      ? `${pluralize(row.walletCount, "wallet")} · ${pluralize(row.networkCount, "network")}`
      : groupBy === "network"
        ? `${pluralize(row.assetCount, "asset")} · ${pluralize(row.walletCount, "wallet")}`
        : `${pluralize(row.assetCount, "asset")} · ${pluralize(row.networkCount, "network")}`;

  return (
    <>
      <tr>
        <th scope="row">
          <button
            aria-controls={detailId}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Hide" : "Show"} composition for ${row.label}`}
            className={detailStyles.expandButton}
            onClick={onToggle}
            type="button"
          >
            <span className={detailStyles.chevron} aria-hidden="true">
              {isExpanded ? "-" : "+"}
            </span>
            <span>
              <span className={styles.assetName}>{row.label}</span>
              {row.symbol && <span className={styles.symbol}>{row.symbol}</span>}
              <span className={styles.rowCounts}>{counts}</span>
            </span>
          </button>
        </th>
        <td className={styles.numeric}>
          {row.quantity === null ? (
            <span className={styles.notApplicable} aria-label="Not applicable">
              -
            </span>
          ) : (
            formatQuantity(row.quantity)
          )}
        </td>
        <td className={styles.numeric}>
          {formatUsd(row.valueUsd)}
          {row.hasUnpricedPositions && (
            <span className={styles.unpriced}>Excludes unpriced</span>
          )}
        </td>
        <td className={styles.numeric}>
          {formatPercent(row.portfolioPercent)}
          <span className={styles.percentTrack} aria-hidden="true">
            <span
              className={styles.percentFill}
              style={{
                width: `${Math.min(Math.max(row.portfolioPercent, 0), 100)}%`,
              }}
            />
          </span>
        </td>
        <td>
          <span className={styles.coverage}>
            {pluralize(row.positionCount, "position")}
          </span>
        </td>
        <td>
          <span className={styles.providerList}>
            {providers.map((provider) => (
              <ProvenanceBadge key={provider} provider={provider} />
            ))}
          </span>
        </td>
      </tr>
      {isExpanded && (
        <tr className={detailStyles.compositionRow} id={detailId}>
          <td colSpan={6}>
            <div className={detailStyles.compositionPanel}>
              <p className={detailStyles.compositionTitle}>
                Position composition
              </p>
              <div className={detailStyles.compositionList}>
                {row.positions.map((position) => (
                  <PositionDetail
                    groupBy={groupBy}
                    key={`${position.walletId}-${position.assetInstanceId}`}
                    position={position}
                  />
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PositionDetail({
  groupBy,
  position,
}: {
  readonly groupBy: GroupBy;
  readonly position: Readonly<NormalizedPosition>;
}) {
  const network = getNetwork(position.networkId);
  const primary =
    groupBy === "token"
      ? position.walletLabel
      : `${position.name} (${position.symbol})`;
  const secondary =
    groupBy === "wallet"
      ? network.name
      : `${network.name} · ${shortenAddress(position.walletAddress)}`;

  return (
    <article className={detailStyles.positionDetail}>
      <div>
        <strong>{primary}</strong>
        <span>{secondary}</span>
      </div>
      <div>
        <small>Quantity</small>
        <span>
          {formatQuantity(position.quantity)} {position.symbol}
        </span>
      </div>
      <div>
        <small>Unit price</small>
        <span>
          {position.priceUsd === null ? "Unavailable" : formatUsd(position.priceUsd)}
        </span>
      </div>
      <div>
        <small>Price source</small>
        <span title={position.source.priceTimestamp ?? undefined}>
          {position.source.priceProvider ?? "Unavailable"}
        </span>
      </div>
      <div>
        <small>Value</small>
        <span>{position.valueUsd === null ? "Unpriced" : formatUsd(position.valueUsd)}</span>
      </div>
      <div>
        <small>{position.contractAddress ? "Contract" : "Asset type"}</small>
        <span
          className={detailStyles.detailMono}
          title={position.contractAddress ?? "Native asset"}
        >
          {position.contractAddress
            ? shortenAddress(position.contractAddress)
            : "Native"}
        </span>
      </div>
    </article>
  );
}

function safeDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
