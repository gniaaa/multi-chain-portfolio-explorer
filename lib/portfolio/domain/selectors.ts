import type {
  GroupBy,
  GroupedPortfolioRow,
  NormalizedPosition,
  PortfolioSummaryViewModel,
} from "../contracts";
import { getNetwork } from "../networks";

function normalizedSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function searchPositions(
  positions: readonly NormalizedPosition[],
  query: string,
): NormalizedPosition[] {
  const needle = normalizedSearchText(query);
  if (!needle) {
    return [...positions];
  }

  return positions.filter((position) => {
    const network = getNetwork(position.networkId);
    return [
      position.name,
      position.symbol,
      position.contractAddress ?? "native",
      position.walletLabel,
      position.walletAddress,
      position.networkId,
      network.name,
      network.shortName,
    ].some((field) => normalizedSearchText(field).includes(needle));
  });
}

function getGroupIdentity(
  position: NormalizedPosition,
  groupBy: GroupBy,
): { id: string; label: string; symbol?: string } {
  if (groupBy === "token") {
    return {
      id: position.canonicalAssetId,
      label: position.name,
      symbol: position.symbol,
    };
  }

  if (groupBy === "network") {
    const network = getNetwork(position.networkId);
    return { id: position.networkId, label: network.name };
  }

  return { id: position.walletId, label: position.walletLabel };
}

function uniqueCount(values: readonly string[]): number {
  return new Set(values).size;
}

export function summarizePortfolio(
  positions: readonly NormalizedPosition[],
): PortfolioSummaryViewModel {
  let totalValueUsd = 0;
  let pricedPositionCount = 0;
  let unpricedPositionCount = 0;

  for (const position of positions) {
    if (position.valueUsd === null) {
      unpricedPositionCount += 1;
    } else {
      totalValueUsd += position.valueUsd;
      pricedPositionCount += 1;
    }
  }

  return {
    totalValueUsd,
    pricedPositionCount,
    unpricedPositionCount,
    isIncomplete: unpricedPositionCount > 0,
  };
}

export function groupPositions(
  positions: readonly NormalizedPosition[],
  groupBy: GroupBy,
): GroupedPortfolioRow[] {
  const grouped = new Map<
    string,
    { label: string; symbol?: string; positions: NormalizedPosition[] }
  >();

  for (const position of positions) {
    const identity = getGroupIdentity(position, groupBy);
    const existing = grouped.get(identity.id);
    if (existing) {
      existing.positions.push(position);
    } else {
      grouped.set(identity.id, {
        label: identity.label,
        ...(identity.symbol === undefined ? {} : { symbol: identity.symbol }),
        positions: [position],
      });
    }
  }

  const portfolioTotal = summarizePortfolio(positions).totalValueUsd;
  const rows = Array.from(grouped, ([id, group]) => {
    const valueUsd = group.positions.reduce(
      (total, position) => total + (position.valueUsd ?? 0),
      0,
    );

    return {
      id,
      groupBy,
      label: group.label,
      ...(group.symbol === undefined ? {} : { symbol: group.symbol }),
      quantity:
        groupBy === "token"
          ? group.positions.reduce(
              (total, position) => total + position.quantity,
              0,
            )
          : null,
      valueUsd,
      portfolioPercent:
        portfolioTotal === 0 ? 0 : (valueUsd / portfolioTotal) * 100,
      positionCount: group.positions.length,
      assetCount: uniqueCount(
        group.positions.map((position) => position.canonicalAssetId),
      ),
      walletCount: uniqueCount(
        group.positions.map((position) => position.walletId),
      ),
      networkCount: uniqueCount(
        group.positions.map((position) => position.networkId),
      ),
      positions: group.positions,
      hasUnpricedPositions: group.positions.some(
        (position) => position.valueUsd === null,
      ),
    } satisfies GroupedPortfolioRow;
  });

  return rows.sort(
    (left, right) =>
      right.valueUsd - left.valueUsd ||
      left.label.localeCompare(right.label) ||
      left.id.localeCompare(right.id),
  );
}

export interface SelectPortfolioRowsOptions {
  positions: readonly NormalizedPosition[];
  groupBy: GroupBy;
  searchQuery?: string;
}

export function selectPortfolioRows({
  positions,
  groupBy,
  searchQuery = "",
}: SelectPortfolioRowsOptions): GroupedPortfolioRow[] {
  return groupPositions(searchPositions(positions, searchQuery), groupBy);
}

