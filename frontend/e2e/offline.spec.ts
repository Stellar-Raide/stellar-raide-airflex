import { expect, test } from "@playwright/test";

/**
 * Offline page auto-reconnect (issue #278).
 *
 * Verifies that the offline fallback page detects the `online` event and
 * automatically redirects to `/` — the user must never have to reload
 * manually after their network is restored.
 *
 * Network interception strategy
 * ─────────────────────────────
 * Playwright's `context.setOffline(true/false)` toggles the browser context
 * network state and fires the real `window.online` / `window.offline` events,
 * which is exactly the mechanism the page listens to. This is preferred over
 * `page.route` stubs for this particular test because we are exercising the
 * browser-native event, not mocking an API response.
 *
 * The test goes offline first, navigates to /offline (simulating the service
 * worker delivering the cached fallback), then brings the network back online
 * and asserts the redirect to `/` fires.
 */

test.describe("Offline page", () => {
  test("redirects to / automatically when network is restored", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => false,
        configurable: true,
      });
    });

    await page.goto("/offline", { waitUntil: "domcontentloaded" });

    // 3. The offline state indicator should be visible.
    await expect(
      page.getByRole("heading", { name: /you're offline/i })
    ).toBeVisible();

    // 4. Restore network connectivity — this fires `window.online`.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => true,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    // 5. The page should first show the "Reconnecting…" state …
    await expect(
      page.getByRole("heading", { name: /reconnecting/i })
    ).toBeVisible({ timeout: 5_000 });

    // 6. … then redirect to `/` automatically (no manual reload required).
    await page.waitForURL("/", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("shows Reconnecting spinner with accessible label", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => false,
        configurable: true,
      });
    });

    await page.goto("/offline", { waitUntil: "domcontentloaded" });

    // Confirm the spinner is NOT present while still offline.
    await expect(page.getByRole("status")).not.toBeVisible();

    // Restore network — spinner should appear.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => true,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    const spinner = page.getByRole("status");
    await expect(spinner).toBeVisible({ timeout: 5_000 });
    await expect(spinner).toHaveAttribute("aria-label", "Reconnecting…");
  });

  test("Retry link is present while offline", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", {
        get: () => false,
        configurable: true,
      });
    });

    await page.goto("/offline", { waitUntil: "domcontentloaded" });

    // The manual Retry link should always be available as a fallback.
    const retry = page.getByRole("link", { name: /retry/i });
    await expect(retry).toBeVisible();
    await expect(retry).toHaveAttribute("href", "/");
  });
});
