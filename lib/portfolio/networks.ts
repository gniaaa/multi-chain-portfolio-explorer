import type { NetworkId } from "./contracts";

export interface NetworkMetadata {
  id: NetworkId;
  chainId: number;
  name: string;
  shortName: string;
  nativeSymbol: string;
  accent: string;
}

export const NETWORKS: Record<NetworkId, NetworkMetadata> = {
  "eip155:1": { id: "eip155:1", chainId: 1, name: "Ethereum", shortName: "ETH", nativeSymbol: "ETH", accent: "#627eea" },
  "eip155:8453": { id: "eip155:8453", chainId: 8453, name: "Base", shortName: "BASE", nativeSymbol: "ETH", accent: "#0052ff" },
  "eip155:137": { id: "eip155:137", chainId: 137, name: "Polygon", shortName: "POL", nativeSymbol: "POL", accent: "#8247e5" },
};

export const SUPPORTED_NETWORK_IDS = Object.freeze(Object.keys(NETWORKS) as NetworkId[]);
export function getNetwork(networkId: NetworkId): NetworkMetadata { return NETWORKS[networkId]; }
