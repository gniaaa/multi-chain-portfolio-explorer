import { normalizeBalance } from "../domain";
import type {
  NormalizedPosition,
  PortfolioProvider,
  WalletTarget,
} from "../contracts";

export interface TargetLoadSuccess {
  target: WalletTarget;
  status: "success";
  positions: NormalizedPosition[];
}

export interface TargetLoadFailure {
  target: WalletTarget;
  status: "error";
  positions: [];
  errorMessage: string;
}

export type TargetLoadResult = TargetLoadSuccess | TargetLoadFailure;

export interface PortfolioLoadResult {
  positions: NormalizedPosition[];
  targets: Record<string, TargetLoadResult>;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === "AbortError") ||
    (typeof DOMException !== "undefined" &&
      error instanceof DOMException &&
      error.name === "AbortError")
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Unable to load this wallet and network.";
}

/** Loads every page for one target. Fixtures currently return one page, but adapters need not. */
export async function loadPortfolioTarget(
  provider: PortfolioProvider,
  target: WalletTarget,
  signal?: AbortSignal,
): Promise<NormalizedPosition[]> {
  const positions: NormalizedPosition[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  do {
    const page = await provider.getBalancePage(target, cursor, signal);

    positions.push(
      ...page.items.map((balance) =>
        normalizeBalance(target, balance, provider.providerName),
      ),
    );

    if (page.nextCursor === null) {
      break;
    }

    if (seenCursors.has(page.nextCursor)) {
      throw new Error(`Provider returned a repeated cursor for ${target.id}`);
    }

    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  } while (true);

  return positions;
}

export async function loadPortfolioTargets(
  provider: PortfolioProvider,
  targets: readonly WalletTarget[],
  signal?: AbortSignal,
): Promise<PortfolioLoadResult> {
  const results = await Promise.all(
    targets.map(async (target): Promise<TargetLoadResult> => {
      try {
        return {
          target,
          status: "success",
          positions: await loadPortfolioTarget(provider, target, signal),
        };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return {
          target,
          status: "error",
          positions: [],
          errorMessage: errorMessage(error),
        };
      }
    }),
  );

  return {
    positions: results.flatMap((result) => result.positions),
    targets: Object.fromEntries(
      results.map((result) => [result.target.id, result]),
    ),
  };
}

