import { describe, expect, it } from "vitest";

import type {
  NetworkId,
  NormalizedPosition,
  RawBalance,
  WalletTarget,
} from "../contracts";
import {
  CANONICAL_ASSET_IDS,
  createAssetInstanceId,
  groupPositions,
  normalizeBalance,
  searchPositions,
  selectPortfolioRows,
  summarizePortfolio,
} from "./index";

const USDC = {
  "eip155:1": "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eB48",
  "eip155:8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "eip155:137": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
} as const satisfies Record<NetworkId, string>;

function target(
  networkId: NetworkId,
  walletId = "wallet-main",
  walletLabel = "Main Wallet",
): WalletTarget {
  return {
    id: `${walletId}-${networkId}`,
    walletId,
    walletLabel,
    address: "0x1111111111111111111111111111111111111111",
    networkId,
  };
}

function raw(overrides: Partial<RawBalance> = {}): RawBalance {
  return {
    contractAddress: USDC["eip155:1"],
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    quantity: 10,
    priceUsd: 1,
    ...overrides,
  };
}

function position(
  networkId: NetworkId,
  overrides: Partial<RawBalance> = {},
  walletId?: string,
  walletLabel?: string,
): NormalizedPosition {
  return normalizeBalance(
    target(networkId, walletId, walletLabel),
    raw(overrides),
    "fixture",
  );
}

describe("asset identity and normalization", () => {
  it("normalizes contract casing into a stable chain-scoped instance ID", () => {
    const normalized = normalizeBalance(
      target("eip155:1"),
      raw({ providerAssetId: "eth-usdc" }),
      "demo-provider",
    );

    expect(normalized.assetInstanceId).toBe(
      "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
    expect(normalized.contractAddress).toBe(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
    expect(normalized.canonicalAssetId).toBe(CANONICAL_ASSET_IDS.usdc);
    expect(normalized.valueUsd).toBe(10);
    expect(normalized.source).toEqual({
      provider: "demo-provider",
      providerAssetId: "eth-usdc",
      priceProvider: "demo-provider",
    });
  });

  it("maps official USDC instances on all supported chains to one canonical asset", () => {
    const positions = (Object.entries(USDC) as [NetworkId, string][]).map(
      ([networkId, contractAddress]) =>
        position(networkId, { contractAddress }),
    );

    expect(new Set(positions.map((item) => item.assetInstanceId)).size).toBe(3);
    expect(
      new Set(positions.map((item) => item.canonicalAssetId)),
    ).toEqual(new Set([CANONICAL_ASSET_IDS.usdc]));
  });

  it("does not merge an unregistered token merely because it uses the USDC symbol", () => {
    const official = position("eip155:1");
    const imitation = position("eip155:1", {
      contractAddress: "0x2222222222222222222222222222222222222222",
      name: "Another USD Coin",
      symbol: "USDC",
    });

    expect(imitation.canonicalAssetId).not.toBe(official.canonicalAssetId);
    expect(groupPositions([official, imitation], "token")).toHaveLength(2);
  });

  it("canonically joins native ETH on Ethereum and Base but keeps Polygon POL separate", () => {
    const ethereum = position("eip155:1", {
      contractAddress: null,
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    });
    const base = position("eip155:8453", {
      contractAddress: null,
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    });
    const polygon = position("eip155:137", {
      contractAddress: null,
      name: "POL",
      symbol: "POL",
      decimals: 18,
    });

    expect(ethereum.canonicalAssetId).toBe(CANONICAL_ASSET_IDS.eth);
    expect(base.canonicalAssetId).toBe(CANONICAL_ASSET_IDS.eth);
    expect(polygon.canonicalAssetId).toBe(CANONICAL_ASSET_IDS.pol);
    expect(createAssetInstanceId("eip155:1", null)).not.toBe(
      createAssetInstanceId("eip155:8453", null),
    );
  });

  it("rejects malformed contract addresses instead of creating ambiguous IDs", () => {
    expect(() =>
      createAssetInstanceId("eip155:1", "USDC"),
    ).toThrow(/Invalid EVM contract address/);
  });
});

describe("portfolio selectors", () => {
  const ethereumUsdc = position("eip155:1", { quantity: 100, priceUsd: 1 });
  const baseUsdc = position(
    "eip155:8453",
    { contractAddress: USDC["eip155:8453"], quantity: 50, priceUsd: 1 },
    "wallet-cold",
    "Cold Wallet",
  );
  const polygonPol = position("eip155:137", {
    contractAddress: null,
    name: "POL",
    symbol: "POL",
    decimals: 18,
    quantity: 25,
    priceUsd: 2,
  });

  it("groups cross-chain canonical assets and sorts rows by priced value", () => {
    const rows = groupPositions(
      [polygonPol, ethereumUsdc, baseUsdc],
      "token",
    );

    expect(rows.map((row) => row.id)).toEqual([
      CANONICAL_ASSET_IDS.usdc,
      CANONICAL_ASSET_IDS.pol,
    ]);
    expect(rows[0]).toMatchObject({
      quantity: 150,
      valueUsd: 150,
      portfolioPercent: 75,
      positionCount: 2,
      assetCount: 1,
      walletCount: 2,
      networkCount: 2,
    });
    expect(rows[1].portfolioPercent).toBe(25);
  });

  it("uses null quantity for heterogeneous network and wallet groups", () => {
    const positions = [ethereumUsdc, baseUsdc, polygonPol];
    const networkRows = groupPositions(positions, "network");
    const walletRows = groupPositions(positions, "wallet");

    expect(networkRows.every((row) => row.quantity === null)).toBe(true);
    expect(walletRows.every((row) => row.quantity === null)).toBe(true);
    expect(walletRows.find((row) => row.id === "wallet-main")).toMatchObject({
      positionCount: 2,
      assetCount: 2,
      networkCount: 2,
      valueUsd: 150,
    });
  });

  it("keeps unpriced positions visible while excluding them from totals and percentages", () => {
    const unpriced = position("eip155:1", {
      contractAddress: "0x3333333333333333333333333333333333333333",
      name: "Mystery Token",
      symbol: "MYST",
      quantity: 999,
      priceUsd: null,
    });
    const rows = groupPositions([unpriced, ethereumUsdc], "token");

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: CANONICAL_ASSET_IDS.usdc,
      valueUsd: 100,
      portfolioPercent: 100,
      hasUnpricedPositions: false,
    });
    expect(rows[1]).toMatchObject({
      valueUsd: 0,
      portfolioPercent: 0,
      hasUnpricedPositions: true,
    });
    expect(summarizePortfolio([unpriced, ethereumUsdc])).toEqual({
      totalValueUsd: 100,
      pricedPositionCount: 1,
      unpricedPositionCount: 1,
      isIncomplete: true,
    });
  });

  it("searches token, wallet, address, and network fields case-insensitively", () => {
    const positions = [ethereumUsdc, baseUsdc, polygonPol];

    expect(searchPositions(positions, "cold")).toEqual([baseUsdc]);
    expect(searchPositions(positions, "PoLyGoN")).toEqual([polygonPol]);
    expect(searchPositions(positions, "0x833589fc")).toEqual([baseUsdc]);
    expect(searchPositions(positions, "usd coin")).toEqual([
      ethereumUsdc,
      baseUsdc,
    ]);
  });

  it("applies search before aggregation so visible percentages use the filtered total", () => {
    const rows = selectPortfolioRows({
      positions: [ethereumUsdc, baseUsdc, polygonPol],
      groupBy: "token",
      searchQuery: "Cold Wallet",
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: CANONICAL_ASSET_IDS.usdc,
      quantity: 50,
      valueUsd: 50,
      portfolioPercent: 100,
    });
  });
});
