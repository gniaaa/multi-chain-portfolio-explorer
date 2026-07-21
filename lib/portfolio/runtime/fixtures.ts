import type {
  BalancePage,
  NetworkId,
  PortfolioProvider,
  PortfolioScenario,
  RawBalance,
  WalletTarget,
} from "../contracts";

export const SEEDED_WALLET_TARGETS = Object.freeze([
  {
    id: "main-ethereum",
    walletId: "main",
    walletLabel: "Main wallet",
    address: "0x7a3f1c9e2d4b6a8f0e1d3c5b7a9f2e4d6c8b0a1f",
    networkId: "eip155:1",
  },
  {
    id: "main-base",
    walletId: "main",
    walletLabel: "Main wallet",
    address: "0x7a3f1c9e2d4b6a8f0e1d3c5b7a9f2e4d6c8b0a1f",
    networkId: "eip155:8453",
  },
  {
    id: "trading-polygon",
    walletId: "trading",
    walletLabel: "Trading wallet",
    address: "0x42b6e5a907c8d3f1a4b2e9c6d7f0a8b5c3e1d924",
    networkId: "eip155:137",
  },
] as const satisfies readonly WalletTarget[]);

export const FIXTURE_PARTIAL_FAILURE_TARGET_ID = "main-base";

const BALANCES_BY_NETWORK: Readonly<Record<NetworkId, readonly RawBalance[]>> = {
  "eip155:1": [
    {
      contractAddress: null,
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
      quantity: 1.42,
      priceUsd: 3_482.16,
      providerAssetId: "ethereum",
    },
    {
      contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      quantity: 6_250,
      priceUsd: 1,
      providerAssetId: "usd-coin",
    },
    {
      contractAddress: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
      name: "Uniswap",
      symbol: "UNI",
      decimals: 18,
      quantity: 42,
      priceUsd: 8.2,
      providerAssetId: "uniswap",
    },
  ],
  "eip155:8453": [
    {
      contractAddress: null,
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
      quantity: 0.82,
      priceUsd: 3_482.16,
      providerAssetId: "ethereum",
    },
    {
      contractAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      quantity: 2_840,
      priceUsd: 1,
      providerAssetId: "usd-coin",
    },
    {
      contractAddress: "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
      name: "Aerodrome",
      symbol: "AERO",
      decimals: 18,
      quantity: 1_250,
      priceUsd: 0.68,
      providerAssetId: "aerodrome-finance",
    },
  ],
  "eip155:137": [
    {
      contractAddress: null,
      name: "POL",
      symbol: "POL",
      decimals: 18,
      quantity: 3_200,
      priceUsd: 0.52,
      providerAssetId: "polygon-ecosystem-token",
    },
    {
      contractAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      quantity: 1_335.5,
      priceUsd: 1,
      providerAssetId: "usd-coin",
    },
    {
      contractAddress: "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
      name: "Chainlink",
      symbol: "LINK",
      decimals: 18,
      quantity: 18,
      priceUsd: 14.5,
      providerAssetId: "chainlink",
    },
    {
      contractAddress: "0x0000000000000000000000000000000000001010",
      name: "Legacy Polygon Token",
      symbol: "MATIC",
      decimals: 18,
      quantity: 0.04,
      priceUsd: null,
      providerAssetId: "matic-network",
    },
  ],
};

type LatencyResolver = number | ((target: WalletTarget) => number);

export interface FixturePortfolioProviderOptions {
  scenario?: PortfolioScenario;
  latencyMs?: LatencyResolver;
  partialFailureTargetId?: string;
}

function abortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("The operation was aborted", "AbortError");
  }

  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
}

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, Math.max(0, ms));

    function onAbort() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function defaultLatency(target: WalletTarget): number {
  const index = SEEDED_WALLET_TARGETS.findIndex(
    (candidate) => candidate.networkId === target.networkId,
  );
  return 24 + Math.max(index, 0) * 12;
}

function cloneBalances(networkId: NetworkId): RawBalance[] {
  return (BALANCES_BY_NETWORK[networkId] ?? []).map((balance) => ({
    ...balance,
  }));
}

/** A deterministic provider used by the demo and by integration tests. */
export class FixturePortfolioProvider implements PortfolioProvider {
  readonly providerName = "Mocked data";
  readonly scenario: PortfolioScenario;

  private readonly latencyMs: LatencyResolver;
  private readonly partialFailureTargetId: string;
  private readonly attempts = new Map<string, number>();

  constructor(
    scenarioOrOptions: PortfolioScenario | FixturePortfolioProviderOptions = {},
  ) {
    const options =
      typeof scenarioOrOptions === "string"
        ? { scenario: scenarioOrOptions }
        : scenarioOrOptions;

    this.scenario = options.scenario ?? "normal";
    this.latencyMs = options.latencyMs ?? defaultLatency;
    this.partialFailureTargetId =
      options.partialFailureTargetId ?? FIXTURE_PARTIAL_FAILURE_TARGET_ID;
  }

  getRequestCount(targetId: string): number {
    return this.attempts.get(targetId) ?? 0;
  }

  async getBalancePage(
    target: WalletTarget,
    _cursor?: string,
    signal?: AbortSignal,
  ): Promise<BalancePage> {
    const latency =
      typeof this.latencyMs === "function"
        ? this.latencyMs(target)
        : this.latencyMs;

    await waitFor(latency, signal);

    if (signal?.aborted) {
      throw abortError();
    }

    const attempt = (this.attempts.get(target.id) ?? 0) + 1;
    this.attempts.set(target.id, attempt);

    if (this.scenario === "error") {
      throw new Error(`Fixture request failed for ${target.walletLabel}`);
    }

    if (
      this.scenario === "partial" &&
      target.id === this.partialFailureTargetId &&
      attempt === 1
    ) {
      throw new Error(`Fixture request failed once for ${target.walletLabel}`);
    }

    return {
      items:
        this.scenario === "empty" ? [] : cloneBalances(target.networkId),
      nextCursor: null,
    };
  }
}

export function createFixturePortfolioProvider(
  scenarioOrOptions: PortfolioScenario | FixturePortfolioProviderOptions = {},
): FixturePortfolioProvider {
  return new FixturePortfolioProvider(scenarioOrOptions);
}
