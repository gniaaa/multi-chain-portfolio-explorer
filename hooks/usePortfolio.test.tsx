import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PortfolioProvider } from "@/lib/portfolio/contracts";
import {
  FIXTURE_PARTIAL_FAILURE_TARGET_ID,
  FixturePortfolioProvider,
  SEEDED_WALLET_TARGETS,
} from "@/lib/portfolio/runtime";
import { usePortfolio } from "./usePortfolio";

describe("usePortfolio", () => {
  it("retains successful targets when one target fails, then recovers", async () => {
    const provider = new FixturePortfolioProvider({
      scenario: "partial",
      latencyMs: 0,
    });
    const { result } = renderHook(() =>
      usePortfolio({ provider, targets: SEEDED_WALLET_TARGETS }),
    );

    await waitFor(() => expect(result.current.state.hasLoaded).toBe(true));

    expect(
      result.current.state.targets[FIXTURE_PARTIAL_FAILURE_TARGET_ID].phase,
    ).toBe("error");
    expect(result.current.state.positions).toHaveLength(7);
    expect(
      Object.values(result.current.state.targets).filter(
        ({ phase }) => phase === "success",
      ),
    ).toHaveLength(2);

    act(() => result.current.retryFailed());
    expect(result.current.state.positions).toHaveLength(7);

    await waitFor(() =>
      expect(
        result.current.state.targets[FIXTURE_PARTIAL_FAILURE_TARGET_ID].phase,
      ).toBe("success"),
    );
    expect(result.current.state.positions).toHaveLength(10);
  });

  it("retries only targets currently marked failed", async () => {
    const attempts = new Map<string, number>();
    const provider: PortfolioProvider = {
      providerName: "targeting-test",
      async getBalancePage(target) {
        const attempt = (attempts.get(target.id) ?? 0) + 1;
        attempts.set(target.id, attempt);
        if (
          target.id === FIXTURE_PARTIAL_FAILURE_TARGET_ID &&
          attempt === 1
        ) {
          throw new Error("transient");
        }
        return { items: [], nextCursor: null };
      },
    };
    const { result } = renderHook(() =>
      usePortfolio({ provider, targets: SEEDED_WALLET_TARGETS }),
    );

    await waitFor(() => expect(result.current.state.hasLoaded).toBe(true));
    act(() => result.current.retryFailed());
    await waitFor(() => expect(result.current.state.isLoading).toBe(false));

    expect(Object.fromEntries(attempts)).toEqual({
      "main-ethereum": 1,
      "main-base": 2,
      "trading-polygon": 1,
    });
  });

  it("distinguishes a successful empty portfolio from a total error", async () => {
    const emptyProvider = new FixturePortfolioProvider({
      scenario: "empty",
      latencyMs: 0,
    });
    const empty = renderHook(() =>
      usePortfolio({ provider: emptyProvider, targets: SEEDED_WALLET_TARGETS }),
    );
    await waitFor(() => expect(empty.result.current.state.hasLoaded).toBe(true));

    expect(empty.result.current.state.positions).toEqual([]);
    expect(
      Object.values(empty.result.current.state.targets).every(
        ({ phase }) => phase === "success",
      ),
    ).toBe(true);
    empty.unmount();

    const errorProvider = new FixturePortfolioProvider({
      scenario: "error",
      latencyMs: 0,
    });
    const failed = renderHook(() =>
      usePortfolio({ provider: errorProvider, targets: SEEDED_WALLET_TARGETS }),
    );
    await waitFor(() =>
      expect(failed.result.current.state.hasLoaded).toBe(true),
    );

    expect(failed.result.current.state.positions).toEqual([]);
    expect(
      Object.values(failed.result.current.state.targets).every(
        ({ phase, errorMessage }) => phase === "error" && !!errorMessage,
      ),
    ).toBe(true);
  });

  it("aborts every in-flight request when unmounted", async () => {
    const signals: AbortSignal[] = [];
    const provider: PortfolioProvider = {
      providerName: "hanging",
      getBalancePage(_target, _cursor, signal) {
        if (signal) signals.push(signal);
        return new Promise((_resolve, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        });
      },
    };
    const portfolio = renderHook(() =>
      usePortfolio({ provider, targets: SEEDED_WALLET_TARGETS }),
    );
    await waitFor(() => expect(signals).toHaveLength(3));

    portfolio.unmount();

    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });
});

