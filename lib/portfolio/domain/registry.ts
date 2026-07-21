import type { CanonicalAssetId, NetworkId } from "../contracts";
import { createAssetInstanceId, createInstanceCanonicalAssetId } from "./identity";

export const CANONICAL_ASSET_IDS = {
  eth: "asset:eth",
  pol: "asset:pol",
  usdc: "asset:usdc",
} as const satisfies Record<string, CanonicalAssetId>;

const OFFICIAL_USDC_CONTRACTS = {
  "eip155:1": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "eip155:8453": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "eip155:137": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
} as const satisfies Partial<Record<NetworkId, string>>;

const CANONICAL_ASSET_REGISTRY = new Map<string, CanonicalAssetId>([
  [createAssetInstanceId("eip155:1", null), CANONICAL_ASSET_IDS.eth],
  [createAssetInstanceId("eip155:8453", null), CANONICAL_ASSET_IDS.eth],
  [createAssetInstanceId("eip155:137", null), CANONICAL_ASSET_IDS.pol],
  ...Object.entries(OFFICIAL_USDC_CONTRACTS).map(
    ([networkId, contractAddress]) =>
      [
        createAssetInstanceId(networkId as NetworkId, contractAddress),
        CANONICAL_ASSET_IDS.usdc,
      ] as const,
  ),
]);

export function getCanonicalAssetId(assetInstanceId: string): CanonicalAssetId {
  return (
    CANONICAL_ASSET_REGISTRY.get(assetInstanceId) ??
    createInstanceCanonicalAssetId(assetInstanceId)
  );
}

export function resolveCanonicalAssetId(
  networkId: NetworkId,
  contractAddress: string | null,
): CanonicalAssetId {
  return getCanonicalAssetId(createAssetInstanceId(networkId, contractAddress));
}

export function isRegisteredCanonicalAsset(assetInstanceId: string): boolean {
  return CANONICAL_ASSET_REGISTRY.has(assetInstanceId);
}

