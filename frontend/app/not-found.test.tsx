import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import NotFound from "./not-found";
import { useAuth } from "./hooks/useAuth";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      heading: "Page not found",
      body: "The page you're looking for doesn't exist or has been moved. Check the URL or head back to the marketplace.",
      browseListings: "Browse Listings",
      sellAsset: "Sell an asset",
      viewWallet: "View your wallet",
      youMightBeLookingFor: "You might be looking for",
      home: "Home",
      marketplace: "Marketplace",
      profile: "Profile",
      sellAirtime: "Sell airtime",
      createAccount: "Create account",
      signIn: "Sign in",
      github: "GitHub",
    };
    if (key === "copyright") {
      return `© ${params?.year ?? 2026} AirFlex. Open source under the MIT License.`;
    }
    return translations[key] ?? key;
  },
}));

// Mock useAuth
jest.mock("./hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

describe("Custom 404 Page With Navigation Suggestions (Issue #472)", () => {
  const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders branded heading, decorative 404, and explanation message", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      role: "user",
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The page you're looking for doesn't exist or has been moved. Check the URL or head back to the marketplace."
      )
    ).toBeInTheDocument();
  });

  it("offers suggested navigation links for guest visitors including Home, Marketplace, and Auth", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      role: "user",
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<NotFound />);

    // Primary CTA
    const primaryCta = screen.getByRole("link", { name: "Browse Listings" });
    expect(primaryCta).toHaveAttribute("href", "/");

    // Semantic navigation suggestions landmark
    const nav = screen.getByRole("navigation", { name: "You might be looking for" });
    expect(nav).toBeInTheDocument();

    // Guest suggestions
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("href", "/");

    const marketplaceLinks = screen.getAllByRole("link", { name: "Marketplace" });
    expect(marketplaceLinks.length).toBeGreaterThan(0);
    expect(marketplaceLinks[0]).toHaveAttribute("href", "/");

    const createAccountLink = screen.getByRole("link", { name: "Create account" });
    expect(createAccountLink).toHaveAttribute("href", "/auth/signup");

    const signInLink = screen.getByRole("link", { name: "Sign in" });
    expect(signInLink).toHaveAttribute("href", "/auth/verify");
  });

  it("offers suggested navigation links for authenticated users including Home, Marketplace, and Profile", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-123", phone: "+2348012345678", stellarPublicKey: "GABC1234567890", role: "user" },
      isLoading: false,
      role: "user",
      token: "mock-token",
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<NotFound />);

    // Profile suggestion
    const profileLink = screen.getByRole("link", { name: "Profile" });
    expect(profileLink).toHaveAttribute("href", "/profile");

    // Home & Marketplace
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("link", { name: "Marketplace" })[0]).toHaveAttribute("href", "/");

    // Wallet quick link
    const walletLinks = screen.getAllByRole("link", { name: "View your wallet" });
    expect(walletLinks.length).toBeGreaterThan(0);
    expect(walletLinks[0]).toHaveAttribute("href", "/wallet");
  });

  it("renders semantic footer with GitHub repository link", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      role: "user",
      token: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(<NotFound />);

    const githubLink = screen.getByRole("link", { name: "GitHub" });
    expect(githubLink).toHaveAttribute("href", "https://github.com/Stellar-Raide/stellar-raide-stellar-raide-stellar-raide-airflex");
    expect(githubLink).toHaveAttribute("target", "_blank");
  });
});
