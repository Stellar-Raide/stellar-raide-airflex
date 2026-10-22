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
 * In dev / test mode, Next-PWA is disabled so there is no service worker cache
 * to deliver offline assets. We navigate to `/offline` while online, stubbing
 * `navigator.onLine` to false on mount to simulate arriving in an offline state.
 * Once the React component finishes hydration (`data-hydrated="true"`), we restore
 * connectivity and dispatch the `online` event to assert the automatic redirect.
 */

test.describe("Offline page", () => {
  test.beforeEach(async ({ page }) => {
    // Stub navigator.onLine during initial load so the mount check in OfflinePage
    // does not immediately redirect before the test begins.
    await page.addInitScript(() => {
      let isOnline = false;
      Object.defineProperty(window.navigator, "onLine", {
        get: () => isOnline,
        configurable: true,
      });
      window.addEventListener("online", () => {
        isOnline = true;
      });
      window.addEventListener("offline", () => {
        isOnline = false;
      });
    });
  });

  test("redirects to / automatically when network is restored", async ({
    page,
  }) => {
    await page.goto("/offline");
    await page.locator('[data-hydrated="true"]').waitFor();

    // 1. The offline state indicator should be visible.
    await expect(
      page.getByRole("heading", { name: /you're offline/i })
    ).toBeVisible();

    // 2. Restore network connectivity — this fires `window.online`.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    // 3. The page should first show the "Reconnecting…" state …
    await expect(
      page.getByRole("heading", { name: /reconnecting/i })
    ).toBeVisible({ timeout: 5_000 });

    // 4. … then redirect to `/` automatically (no manual reload required).
    await page.waitForURL("/", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test("shows Reconnecting spinner with accessible label", async ({
    page,
  }) => {
    await page.goto("/offline");
    await page.locator('[data-hydrated="true"]').waitFor();

    // Confirm the spinner is NOT present while still offline.
    await expect(page.getByRole("status")).not.toBeVisible();

    // Restore network — spinner should appear.
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    const spinner = page.getByRole("status");
    await expect(spinner).toBeVisible({ timeout: 5_000 });
    await expect(spinner).toHaveAttribute("aria-label", "Reconnecting…");
  });

  test("Retry link is present while offline", async ({ page }) => {
    await page.goto("/offline");
    await page.locator('[data-hydrated="true"]').waitFor();

    // The manual Retry link should always be available as a fallback.
    const retry = page.getByRole("link", { name: /retry/i });
    await expect(retry).toBeVisible();
    await expect(retry).toHaveAttribute("href", "/");
  });
});
