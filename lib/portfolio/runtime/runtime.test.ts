import { describe, expect, it, vi } from "vitest";

import type {
  BalancePage,
  PortfolioProvider,
  WalletTarget,
} from "../contracts";
import {
  FIXTURE_PARTIAL_FAILURE_TARGET_ID,
  FixturePortfolioProvider,
  SEEDED_WALLET_TARGETS,
  loadPortfolioTarget,
  loadPortfolioTargets,
} from ".";

describe("FixturePortfolioProvider", () => {
  it("seeds Ethereum, Base, and Polygon and returns terminal pages", async () => {
    expect(SEEDED_WALLET_TARGETS.map((target) => target.networkId)).toEqual([
      "eip155:1",
      "eip155:8453",
      "eip155:137",
    ]);

    const provider = new FixturePortfolioProvider({ latencyMs: 0 });
    const pages = await Promise.all(
      SEEDED_WALLET_TARGETS.map((target) =>
        provider.getBalancePage(target),
      ),
    );

    expect(pages.every((page) => page.nextCursor === null)).toBe(true);
    expect(pages.every((page) => page.items.length > 0)).toBe(true);
  });

  it("models empty, total-error, and fail-once partial scenarios", async () => {
    const target = SEEDED_WALLET_TARGETS.find(
      (candidate) => candidate.id === FIXTURE_PARTIAL_FAILURE_TARGET_ID,
    )!;

    await expect(
      new FixturePortfolioProvider({ scenario: "empty", latencyMs: 0 })
        .getBalancePage(target),
    ).resolves.toEqual({ items: [], nextCursor: null });

    await expect(
      new FixturePortfolioProvider({ scenario: "error", latencyMs: 0 })
        .getBalancePage(target),
    ).rejects.toThrow("Fixture request failed");

    const partial = new FixturePortfolioProvider({
      scenario: "partial",
      latencyMs: 0,
    });
    await expect(partial.getBalancePage(target)).rejects.toThrow("failed once");
    await expect(partial.getBalancePage(target)).resolves.toMatchObject({
      nextCursor: null,
    });
  });
});

describe("portfolio loading", () => {
  it("starts target requests concurrently", async () => {
    let active = 0;
    let peakActive = 0;
    const release: Array<() => void> = [];
    const provider: PortfolioProvider = {
      providerName: "controlled",
      async getBalancePage() {
        active += 1;
        peakActive = Math.max(peakActive, active);
        await new Promise<void>((resolve) => release.push(resolve));
        active -= 1;
        return { items: [], nextCursor: null };
      },
    };

    const loading = loadPortfolioTargets(provider, SEEDED_WALLET_TARGETS);
    await vi.waitFor(() => expect(release).toHaveLength(3));
    expect(peakActive).toBe(3);
    release.forEach((resolve) => resolve());
    await expect(loading).resolves.toMatchObject({ positions: [] });
  });

  it("follows opaque cursors until the provider returns null", async () => {
    const target = SEEDED_WALLET_TARGETS[0];
    const cursors: Array<string | undefined> = [];
    const provider: PortfolioProvider = {
      providerName: "paged",
      async getBalancePage(_target, cursor): Promise<BalancePage> {
        cursors.push(cursor);
        return cursor === undefined
          ? {
              items: [
                {
                  contractAddress: null,
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                  quantity: 1,
                  priceUsd: 2,
                },
              ],
              nextCursor: "page-2",
            }
          : {
              items: [
                {
                  contractAddress:
                    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                  name: "USD Coin",
                  symbol: "USDC",
                  decimals: 6,
                  quantity: 3,
                  priceUsd: 1,
                },
              ],
              nextCursor: null,
            };
      },
    };

    await expect(loadPortfolioTarget(provider, target)).resolves.toHaveLength(2);
    expect(cursors).toEqual([undefined, "page-2"]);
  });

  it("passes abort signals through to the provider", async () => {
    const target = SEEDED_WALLET_TARGETS[0];
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const provider: PortfolioProvider = {
      providerName: "abortable",
      getBalancePage(
        _target: WalletTarget,
        _cursor?: string,
        signal?: AbortSignal,
      ) {
        receivedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        });
      },
    };

    const loading = loadPortfolioTarget(provider, target, controller.signal);
    controller.abort();

    expect(receivedSignal).toBe(controller.signal);
    await expect(loading).rejects.toMatchObject({ name: "AbortError" });
  });
});

