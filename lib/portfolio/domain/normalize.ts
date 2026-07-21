import type {
  NormalizedPosition,
  RawBalance,
  WalletTarget,
} from "../contracts";
import { createAssetInstanceId, normalizeContractAddress } from "./identity";
import { getCanonicalAssetId } from "./registry";

export function normalizeBalance(
  target: WalletTarget,
  balance: RawBalance,
  providerName: string,
): NormalizedPosition {
  const contractAddress = normalizeContractAddress(balance.contractAddress);
  const assetInstanceId = createAssetInstanceId(
    target.networkId,
    contractAddress,
  );

  return {
    positionKind: "wallet-token",
    walletId: target.walletId,
    walletLabel: target.walletLabel,
    walletAddress: target.address,
    networkId: target.networkId,
    assetInstanceId,
    canonicalAssetId: getCanonicalAssetId(assetInstanceId),
    name: balance.name.trim(),
    symbol: balance.symbol.trim(),
    contractAddress,
    decimals: balance.decimals,
    quantity: balance.quantity,
    priceUsd: balance.priceUsd,
    valueUsd:
      balance.priceUsd === null ? null : balance.quantity * balance.priceUsd,
    source: {
      provider: providerName,
      ...(balance.providerAssetId === undefined
        ? {}
        : { providerAssetId: balance.providerAssetId }),
      priceProvider:
        balance.priceUsd === null
          ? null
          : (balance.priceProvider ?? providerName),
      ...(balance.priceTimestamp === undefined
        ? {}
        : { priceTimestamp: balance.priceTimestamp }),
    },
  };
}

export function normalizeBalances(
  target: WalletTarget,
  balances: readonly RawBalance[],
  providerName: string,
): NormalizedPosition[] {
  return balances.map((balance) =>
    normalizeBalance(target, balance, providerName),
  );
}
