import type {
  CanonicalAssetId,
  NetworkId,
} from "../contracts";

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

/**
 * Contract addresses are identity-bearing data, so normalize their case once at
 * the domain boundary. Native assets are represented by `null`.
 */
export function normalizeContractAddress(
  contractAddress: string | null,
): string | null {
  if (contractAddress === null) {
    return null;
  }

  const normalized = contractAddress.trim().toLowerCase();
  if (!EVM_ADDRESS_PATTERN.test(normalized)) {
    throw new Error(`Invalid EVM contract address: ${contractAddress}`);
  }

  return normalized;
}

/**
 * An asset instance identifies one concrete asset on one chain. It deliberately
 * contains no symbol or provider-specific identifier.
 */
export function createAssetInstanceId(
  networkId: NetworkId,
  contractAddress: string | null,
): string {
  const normalizedAddress = normalizeContractAddress(contractAddress);
  return normalizedAddress === null
    ? `${networkId}/native`
    : `${networkId}/erc20:${normalizedAddress}`;
}

export function createInstanceCanonicalAssetId(
  assetInstanceId: string,
): CanonicalAssetId {
  return `asset:${assetInstanceId}`;
}

