import {
  DEFAULT_NOTIFICATION_LOCALE,
  LOCALIZED_NOTIFICATION_TEMPLATES,
  NOTIFICATION_TEMPLATES,
  renderTradeDisputeOpened,
  renderWithFallbacks,
  resolveNotificationLocale,
} from "./notificationTemplates";

const RAW_TOKEN = /\{[A-Za-z_][A-Za-z0-9_]*\}/;

describe("trade_dispute_opened template (issue #490)", () => {
  const full = {
    tradeId: "trd_123",
    counterparty: "@stellar-raide-stellar-raide-airflex_9f2c",
    reason: "Airtime was never delivered",
    disputeLink: "https://stellar-raide-stellar-raide-airflex.app/trades/trd_123",
  };

  it("is registered under the trade_dispute_opened key with an English message", () => {
    const template = LOCALIZED_NOTIFICATION_TEMPLATES.trade_dispute_opened;
    expect(template.messages.en).toEqual(expect.any(String));
    for (const name of ["tradeId", "counterparty", "reason", "disputeLink"]) {
      expect(template.messages.en).toContain(`{${name}}`);
    }
  });

  it("defines a fallback for every placeholder in every locale", () => {
    const template = LOCALIZED_NOTIFICATION_TEMPLATES.trade_dispute_opened;
    for (const locale of Object.keys(template.messages) as Array<keyof typeof template.messages>) {
      const placeholders = [...template.messages[locale].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const name of placeholders) {
        expect(template.defaults[locale]).toHaveProperty(name!);
        expect(template.defaults[locale][name as keyof typeof template.defaults.en]).not.toBe("");
      }
    }
  });

  it("renders the full context exactly", () => {
    expect(renderTradeDisputeOpened(full)).toBe(
      "AirFlex: A dispute has been opened on trade trd_123 with @stellar-raide-stellar-raide-airflex_9f2c. " +
        "Reason: Airtime was never delivered. Funds stay in escrow while our team " +
        "reviews it within 24 hours. View the dispute: https://stellar-raide-stellar-raide-airflex.app/trades/trd_123"
    );
  });

  it("falls back to safe defaults instead of exposing raw placeholder tokens", () => {
    const text = renderTradeDisputeOpened({});

    expect(text).not.toMatch(RAW_TOKEN);
    expect(text).toContain("on trade your trade with your trading partner");
    expect(text).toContain("Reason: not specified.");
    expect(text).toContain("View the dispute: open the AirFlex app");
  });

  it.each([
    ["blank", "   "],
    ["empty", ""],
  ])("treats a %s value as missing", (_label, reason) => {
    expect(renderTradeDisputeOpened({ ...full, reason })).toContain("Reason: not specified.");
  });

  it("falls back per field, keeping the values that are present", () => {
    const text = renderTradeDisputeOpened({ tradeId: "trd_9", reason: "Wrong network" });

    expect(text).toContain("trade trd_9 with your trading partner");
    expect(text).toContain("Reason: Wrong network.");
    expect(text).not.toMatch(RAW_TOKEN);
  });

  it("does not expand placeholders smuggled inside values", () => {
    const text = renderTradeDisputeOpened({ ...full, reason: "see {disputeLink} {tradeId}" });

    expect(text).toContain("Reason: see {disputeLink} {tradeId}.");
  });

  it("collapses line breaks and control characters in user-supplied values", () => {
    const text = renderTradeDisputeOpened({ ...full, reason: "line one\r\n\tline two\u0007" });

    expect(text).toContain("Reason: line one line two.");
    expect(text).not.toMatch(/[\r\n\t\u0007]/);
  });

  it("truncates very long values", () => {
    const text = renderTradeDisputeOpened({ ...full, reason: "x".repeat(500) });
    const reason = /Reason: (x+…)\./.exec(text)?.[1];

    expect(reason).toBeDefined();
    expect(reason!.length).toBe(160);
  });

  it("uses the default locale for unsupported or missing locales", () => {
    const english = renderTradeDisputeOpened(full, "en");
    expect(renderTradeDisputeOpened(full, "fr-FR")).toBe(english);
    expect(renderTradeDisputeOpened(full, null)).toBe(english);
    expect(renderTradeDisputeOpened(full)).toBe(english);
  });
});

describe("resolveNotificationLocale", () => {
  it.each([
    ["en", "en"],
    ["en-NG", "en"],
    ["EN_gb", "en"],
    ["yo-NG", DEFAULT_NOTIFICATION_LOCALE],
    ["", DEFAULT_NOTIFICATION_LOCALE],
    [undefined, DEFAULT_NOTIFICATION_LOCALE],
  ])("%p → %p", (input, expected) => {
    expect(resolveNotificationLocale(input)).toBe(expected);
  });
});

describe("renderWithFallbacks", () => {
  it("renders an unknown placeholder with no default as empty, never as a raw token", () => {
    expect(renderWithFallbacks("Hi {name}{suffix}!", { name: "Ada" })).toBe("Hi Ada!");
  });

  it("stringifies numbers, including zero", () => {
    expect(renderWithFallbacks("{amount}", { amount: 0 }, { amount: "n/a" })).toBe("0");
  });

  it("uses the default for null and undefined", () => {
    expect(renderWithFallbacks("{a}/{b}", { a: null, b: undefined }, { a: "A", b: "B" })).toBe("A/B");
  });
});

describe("legacy SMS templates", () => {
  it("are unchanged by the localized catalogue", () => {
    expect(NOTIFICATION_TEMPLATES.DISPUTE_FILED).toContain("{tradeId}");
  });
});
