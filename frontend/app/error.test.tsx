import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import GlobalError from "./error";
import { reportError } from "./lib/monitoring";

jest.mock("./lib/monitoring", () => ({
  reportError: jest.fn(),
}));

describe("GlobalError route component (app/error.tsx)", () => {
  const mockReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders friendly error UI and calls reportError on mount", () => {
    const testError = Object.assign(new Error("Database connection dropped"), {
      digest: "ERR_123456",
    });

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Something went wrong"
    );
    expect(
      screen.getByText(/An unexpected error occurred while loading this page/i)
    ).toBeInTheDocument();
    expect(screen.getByText("ERR_123456")).toBeInTheDocument();

    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        digest: "ERR_123456",
        source: "route-error",
        message: "Database connection dropped",
      })
    );
  });

  it("calls reset() when 'Try again' button is clicked", () => {
    const testError = new Error("ChunkLoadError: loading chunk failed");

    render(<GlobalError error={testError} reset={mockReset} />);

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fireEvent.click(tryAgainBtn);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it("renders a link back to the marketplace", () => {
    const testError = new Error("Network timeout");

    render(<GlobalError error={testError} reset={mockReset} />);

    const marketplaceLink = screen.getByRole("link", {
      name: /back to marketplace/i,
    });
    expect(marketplaceLink).toBeInTheDocument();
    expect(marketplaceLink).toHaveAttribute("href", "/");
  });

  it("does not render Error ID when digest is not provided", () => {
    const testError = new Error("Generic failure without digest");

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(screen.queryByText(/Error ID:/i)).not.toBeInTheDocument();
  });

  it("includes dark mode theme tokens for responsive themed rendering", () => {
    const testError = new Error("Theme test error");

    const { container } = render(
      <GlobalError error={testError} reset={mockReset} />
    );

    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("dark:bg-gray-900");

    const alertCard = screen.getByRole("alert");
    expect(alertCard.className).toContain("dark:border-gray-800");

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("dark:text-gray-100");
  });
});
