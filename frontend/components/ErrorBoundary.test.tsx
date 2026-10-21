import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ErrorBoundary from "./ErrorBoundary";
import { reportError } from "../app/lib/monitoring";

jest.mock("../app/lib/monitoring", () => ({
  reportError: jest.fn(),
}));

function ThrowingChild(): React.ReactNode {
  throw new Error("boom: child failed to render");
}

function MisbehavingTradeCard(): React.ReactNode {
  const trade = undefined as unknown as {
    amount: { toLocaleString: () => string };
  };
  return <span>{trade.amount.toLocaleString()}</span>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the inline fallback, keeps the rest of the page, and reports the error", () => {
    render(
      <div>
        <p>Hero content</p>
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </div>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it("catches an error thrown by a misbehaving TradeCard-like child", () => {
    render(
      <ErrorBoundary context={{ section: "MarketplaceListings.grid" }}>
        <div>
          <span>Other listings</span>
          <MisbehavingTradeCard />
        </div>
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Other listings")).not.toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ section: "MarketplaceListings.grid" })
    );
  });

  it("renders a custom fallback when one is provided", () => {
    render(
      <ErrorBoundary fallback={<span>Custom fallback</span>}>
        <ThrowingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("calls onReset and recovers when 'Try again' button is clicked", () => {
    let shouldThrow = true;
    const onReset = jest.fn(() => {
      shouldThrow = false;
    });

    function RecoverableChild() {
      if (shouldThrow) {
        throw new Error("Temporary error");
      }
      return <div>Recovered child content</div>;
    }

    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <RecoverableChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    tryAgainBtn.click();
    expect(onReset).toHaveBeenCalledTimes(1);

    rerender(
      <ErrorBoundary onReset={onReset}>
        <RecoverableChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("Recovered child content")).toBeInTheDocument();
  });
});
