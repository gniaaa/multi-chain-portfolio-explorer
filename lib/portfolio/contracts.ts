export type NetworkId = `eip155:${number}`;
export type CanonicalAssetId = `asset:${string}`;
export type GroupBy = "token" | "network" | "wallet";
export type PortfolioScenario = "normal" | "partial" | "empty" | "error";

export interface WalletTarget {
  id: string;
  walletId: string;
  walletLabel: string;
  address: string;
  networkId: NetworkId;
}

export interface RawBalance {
  contractAddress: string | null;
  name: string;
  symbol: string;
  decimals: number;
  quantity: number;
  priceUsd: number | null;
  providerAssetId?: string;
  priceProvider?: string;
  priceTimestamp?: string;
}

export interface BalancePage {
  items: RawBalance[];
  nextCursor: string | null;
}

export interface PortfolioProvider {
  providerName: string;
  getBalancePage(
    target: WalletTarget,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<BalancePage>;
}

export interface NormalizedPosition {
  positionKind: "wallet-token";
  walletId: string;
  walletLabel: string;
  walletAddress: string;
  networkId: NetworkId;
  assetInstanceId: string;
  canonicalAssetId: CanonicalAssetId;
  name: string;
  symbol: string;
  contractAddress: string | null;
  decimals: number;
  quantity: number;
  priceUsd: number | null;
  valueUsd: number | null;
  source: {
    provider: string;
    providerAssetId?: string;
    priceProvider: string | null;
    priceTimestamp?: string;
  };
}

export type TargetLoadPhase = "idle" | "loading" | "success" | "error";

export interface TargetLoadState {
  target: WalletTarget;
  phase: TargetLoadPhase;
  errorMessage?: string;
}

export interface PortfolioLoadState {
  positions: NormalizedPosition[];
  targets: Record<string, TargetLoadState>;
  isLoading: boolean;
  hasLoaded: boolean;
}

export interface GroupedPortfolioRow {
  id: string;
  groupBy: GroupBy;
  label: string;
  symbol?: string;
  quantity: number | null;
  valueUsd: number;
  portfolioPercent: number;
  positionCount: number;
  assetCount: number;
  walletCount: number;
  networkCount: number;
  positions: readonly NormalizedPosition[];
  hasUnpricedPositions: boolean;
}

export interface PortfolioSummaryViewModel {
  totalValueUsd: number;
  pricedPositionCount: number;
  unpricedPositionCount: number;
  isIncomplete: boolean;
}

export interface RequestFailureViewModel {
  targetId: string;
  walletLabel: string;
  networkLabel: string;
  message: string;
}
