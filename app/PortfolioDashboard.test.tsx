import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PortfolioDashboard } from "./PortfolioDashboard";

afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

function renderScenario(scenario: "partial" | "empty" | "error") {
  window.history.pushState({}, "", `/?scenario=${scenario}`);
  render(<PortfolioDashboard />);
}

describe("PortfolioDashboard scenarios", () => {
  it("shows partial failures without hiding successful balances", async () => {
    renderScenario("partial");

    await waitFor(() =>
      expect(screen.getByText(/portfolio total is partial/i)).toBeInTheDocument(),
    );

    expect(screen.getByText(/Mocked data · partial scenario/i)).toBeInTheDocument();
    expect(screen.getByText("Retry unavailable balances")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Portfolio grouped by token" })).toBeInTheDocument();
  });

  it("shows the true empty state for successful empty results", async () => {
    renderScenario("empty");

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "These wallets are ready" })).toBeInTheDocument(),
    );

    expect(screen.getByText(/Mocked data · empty scenario/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the total error state when every target fails", async () => {
    renderScenario("error");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Portfolio could not be loaded"),
    );

    expect(screen.getByText(/Mocked data · error scenario/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry loading portfolio" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
