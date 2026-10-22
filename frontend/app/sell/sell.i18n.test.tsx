/**
 * Sell flow localisation (issue #453): every string comes from the `Sell`
 * catalog, every supported locale has every key, dynamic values (amounts,
 * currency, durations) are interpolated, and switching language re-renders
 * the page in place — same DOM, same form state, no reload.
 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NextIntlClientProvider } from "next-intl";
import SellPage from "./page";
import { resetConversionRateCache } from "./ratesCache";
import { catalogs } from "../../i18n/testing";
import { routing } from "../../i18n/routing";

jest.mock("next-intl", () => jest.requireActual("../../i18n/testing").nextIntlMock);

jest.mock("../lib/auth", () => ({
  isAuthenticated: () => true,
  getToken: () => "mock-jwt-token",
}));

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((out, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? { ...out, [path]: value } : { ...out, ...flatten(value, path) };
  }, {});
}

/** Argument names a message interpolates, e.g. "{count, plural, …} {max}" → count, max. */
function argumentNames(message: string): string[] {
  return [...new Set([...message.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]!))].sort();
}

/** Tags a rich-text message uses, e.g. "<strong>". */
function tagNames(message: string): string[] {
  return [...new Set([...message.matchAll(/<(\w+)>/g)].map((m) => m[1]!))].sort();
}

function mockApi() {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes("/api/v1/profile")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { kycStatus: "verified" } }) });
    }
    if (url.includes("/api/v1/rates")) {
      return Promise.resolve({ ok: true, json: async () => ({ rate: 1600 }) });
    }
    return Promise.reject(new Error(`Unknown URL ${url}`));
  }) as unknown as typeof fetch;
}

function page(locale: string) {
  return (
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <SellPage />
    </NextIntlClientProvider>
  );
}

describe("Sell catalog (issue #453)", () => {
  const english = flatten(catalogs["en"]!["Sell"] as Tree);

  it.each(routing.locales.filter((l) => l !== "en"))(
    "%s has every Sell key, with the same arguments and tags as English",
    (locale) => {
      const translated = flatten(catalogs[locale]!["Sell"] as Tree);

      expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
      for (const [key, message] of Object.entries(english)) {
        expect({ key, args: argumentNames(translated[key]!) }).toEqual({ key, args: argumentNames(message) });
        expect({ key, tags: tagNames(translated[key]!) }).toEqual({ key, tags: tagNames(message) });
      }
    }
  );
});

describe("SellPage localisation (issue #453)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetConversionRateCache();
    mockApi();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("interpolates the asset, naira amount and duration into the listing preview", async () => {
    render(page("en"));
    await screen.findByLabelText(/Amount/i);

    fireEvent.change(screen.getByLabelText(/Asset type/i), { target: { value: "GLO_DATA" } });
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "5000" } });
    fireEvent.click(screen.getByLabelText("2 days"));

    const preview = screen.getByText("Listing preview").parentElement!;
    expect(preview).toHaveTextContent("Selling Glo — Data for ₦5,000, expires in 2 days.");
    expect(screen.getByTestId("conversion-preview")).toHaveTextContent("≈ 3.13 USDC");
  });

  it("interpolates the per-listing maximum into the amount error", async () => {
    render(page("en"));
    await screen.findByLabelText(/Amount/i);

    fireEvent.change(screen.getByLabelText(/Asset type/i), { target: { value: "MTN_AIRTIME" } });
    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "2000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create listing" }));

    expect(await screen.findByText("Amount cannot exceed ₦1,000,000 per listing.")).toBeInTheDocument();
  });

  it("switches language in place, keeping the form and its state", async () => {
    const { rerender, container } = render(page("en"));
    await screen.findByLabelText(/Amount/i);

    fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: "750" } });
    fireEvent.click(screen.getByRole("button", { name: "Create listing" }));
    expect(await screen.findByText("Please select an asset type.")).toBeInTheDocument();

    const form = container.querySelector("form");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sell Airtime or Data");

    rerender(page("yo"));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ta Airtime tàbí Data");
    expect(screen.getByRole("button", { name: "Ṣe ìpolówó" })).toBeInTheDocument();
    // Errors are stored as keys, so the one already shown follows the switch.
    expect(screen.getByText("Jọ̀wọ́ yan irú asset.")).toBeInTheDocument();
    expect(screen.queryByText("Please select an asset type.")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "MTN — Airtime" })).toBeInTheDocument();
    expect(screen.getByLabelText("wákàtí 24")).toBeChecked();

    // Same form element and the typed amount survives: nothing reloaded.
    expect(container.querySelector("form")).toBe(form);
    expect(screen.getByLabelText(/Iye/)).toHaveValue("750");
  });

  it.each(routing.locales)("renders the whole page in %s without a missing key", async (locale) => {
    render(page(locale));
    // The translator throws on a missing key, so reaching the form is the check.
    expect(await screen.findByRole("button", { name: catalogsSell(locale, "submit") })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("conversion-preview")).toBeInTheDocument());
  });
});

function catalogsSell(locale: string, key: string): string {
  return (catalogs[locale]!["Sell"] as Record<string, string>)[key]!;
}
