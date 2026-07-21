"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  NormalizedPosition,
  PortfolioLoadState,
  PortfolioProvider,
  PortfolioScenario,
  TargetLoadState,
  WalletTarget,
} from "@/lib/portfolio/contracts";
import {
  createFixturePortfolioProvider,
  errorMessage,
  isAbortError,
  loadPortfolioTarget,
  SEEDED_WALLET_TARGETS,
} from "@/lib/portfolio/runtime";

export interface UsePortfolioOptions {
  provider?: PortfolioProvider;
  targets?: readonly WalletTarget[];
  scenario?: PortfolioScenario;
}

export interface UsePortfolioResult {
  state: PortfolioLoadState;
  retryFailed: () => void;
}

function targetStates(
  targets: readonly WalletTarget[],
  phase: TargetLoadState["phase"],
): Record<string, TargetLoadState> {
  return Object.fromEntries(
    targets.map((target) => [target.id, { target, phase }]),
  );
}

function belongsToTarget(
  position: NormalizedPosition,
  target: WalletTarget,
): boolean {
  return (
    position.walletId === target.walletId &&
    position.walletAddress.toLowerCase() === target.address.toLowerCase() &&
    position.networkId === target.networkId
  );
}

export function usePortfolio({
  provider: suppliedProvider,
  targets = SEEDED_WALLET_TARGETS,
  scenario = "normal",
}: UsePortfolioOptions = {}): UsePortfolioResult {
  const fixtureProvider = useMemo(
    () => createFixturePortfolioProvider({ scenario }),
    [scenario],
  );
  const provider = suppliedProvider ?? fixtureProvider;
  const [state, setState] = useState<PortfolioLoadState>(() => ({
    positions: [],
    targets: targetStates(targets, "idle"),
    isLoading: false,
    hasLoaded: false,
  }));
  const runIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const runTargets = useCallback(
    (targetsToLoad: readonly WalletTarget[], reset: boolean) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const runId = ++runIdRef.current;

      setState((current) => {
        const nextTargets = reset
          ? targetStates(targets, "loading")
          : { ...current.targets };

        if (!reset) {
          for (const target of targetsToLoad) {
            nextTargets[target.id] = { target, phase: "loading" };
          }
        }

        return {
          positions: reset ? [] : current.positions,
          targets: nextTargets,
          isLoading: targetsToLoad.length > 0,
          hasLoaded: reset ? false : current.hasLoaded,
        };
      });

      void Promise.all(
        targetsToLoad.map(async (target) => {
          try {
            const positions = await loadPortfolioTarget(
              provider,
              target,
              controller.signal,
            );

            if (controller.signal.aborted || runId !== runIdRef.current) return;

            setState((current) => ({
              ...current,
              positions: [
                ...current.positions.filter(
                  (position) => !belongsToTarget(position, target),
                ),
                ...positions,
              ],
              targets: {
                ...current.targets,
                [target.id]: { target, phase: "success" },
              },
            }));
          } catch (error) {
            if (
              isAbortError(error) ||
              controller.signal.aborted ||
              runId !== runIdRef.current
            ) {
              return;
            }

            setState((current) => ({
              ...current,
              targets: {
                ...current.targets,
                [target.id]: {
                  target,
                  phase: "error",
                  errorMessage: errorMessage(error),
                },
              },
            }));
          }
        }),
      ).then(() => {
        if (controller.signal.aborted || runId !== runIdRef.current) return;

        setState((current) => ({
          ...current,
          isLoading: false,
          hasLoaded: true,
        }));
      });
    },
    [provider, targets],
  );

  useEffect(() => {
    runTargets(targets, true);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [runTargets, targets]);

  const retryFailed = useCallback(() => {
    const failedTargets = Object.values(state.targets)
      .filter((targetState) => targetState.phase === "error")
      .map((targetState) => targetState.target);

    if (failedTargets.length > 0) {
      runTargets(failedTargets, false);
    }
  }, [runTargets, state.targets]);

  return { state, retryFailed };
}

