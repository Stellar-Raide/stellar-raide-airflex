import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ProfileLoading from "./loading";
import {
  Bone,
  ProfilePageSkeleton,
  ProfileDetailsSkeleton,
  TradeHistorySkeleton,
  ProfileWalletSkeleton,
} from "./skeletons";

describe("Profile Loading Skeletons and Route Loading (Issue #467)", () => {
  describe("Bone primitive", () => {
    it("renders with base styling and aria-hidden", () => {
      const { container } = render(<Bone className="h-4 w-20" />);
      const el = container.firstElementChild;
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute("aria-hidden", "true");
      expect(el).toHaveClass("bg-gray-200");
      expect(el).toHaveClass("h-4");
      expect(el).toHaveClass("w-20");
    });
  });

  describe("ProfileDetailsSkeleton", () => {
    it("renders with appropriate aria-label and skeleton elements", () => {
      render(<ProfileDetailsSkeleton />);
      const section = screen.getByLabelText("Loading account details");
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass("animate-pulse");
    });
  });

  describe("TradeHistorySkeleton", () => {
    it("renders with appropriate aria-label and table skeleton", () => {
      render(<TradeHistorySkeleton />);
      const section = screen.getByLabelText("Loading trade history");
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass("animate-pulse");
    });
  });

  describe("ProfileWalletSkeleton", () => {
    it("renders with appropriate aria-label", () => {
      render(<ProfileWalletSkeleton />);
      const section = screen.getByLabelText("Loading account settings");
      expect(section).toBeInTheDocument();
      expect(section).toHaveClass("animate-pulse");
    });
  });

  describe("ProfilePageSkeleton and ProfileLoading", () => {
    it("renders full page skeleton with role=status and accessible label", () => {
      render(<ProfilePageSkeleton />);
      const statusEl = screen.getByRole("status", { name: "Loading profile page" });
      expect(statusEl).toBeInTheDocument();

      // Ensure all child sections are present
      expect(screen.getByLabelText("Loading account details")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading trade history")).toBeInTheDocument();
      expect(screen.getByLabelText("Loading account settings")).toBeInTheDocument();
    });

    it("renders ProfileLoading default export identically to ProfilePageSkeleton", () => {
      render(<ProfileLoading />);
      expect(screen.getByRole("status", { name: "Loading profile page" })).toBeInTheDocument();
    });
  });
});
