import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

import { API_URL, TEST_TRADE, mockCreateListing, signIn, testJwt } from "./support/mocks";

/**
 * Full trade lifecycle (Issue #531): listing creation → deposit into escrow →
 * payment confirmation → escrow release, with buyer and seller each signed in
 * through their own browser context.
 *
 * The trade page renders server-side, so the lifecycle trade lives in the stub
 * API (e2e/support/mock-api.mjs) where its status can move between stages.
 * Wallet reads are client-side and intercepted per context from `balances`.
 */

const LIFECYCLE_TRADE_ID = "trade_e2e_lifecycle";
const SELLER = { id: "seller_e2e", sub: "seller_e2e" };
const BUYER = { id: "buyer_e2e", sub: "buyer_e2e" };

const AMOUNT = TEST_TRADE.amount;
const SELLER_NET = TEST_TRADE.seller_net_amount;

const balances = { seller: 1000, buyer: 10_000 };

function naira(value: number): RegExp {
  return new RegExp(`₦${value.toLocaleString("en-NG")}(\\.00)?`);
}

async function openAs(
  context: BrowserContext,
  user: { id: string; sub: string },
  role: keyof typeof balances,
): Promise<Page> {
  const page = await context.newPage();
  await signIn(page, { sub: user.sub });

  // The trade page identifies buyer and seller from the stored user.
  await page.addInitScript((value) => {
    window.localStorage.setItem(
      "stellar-raide-stellar-raide-airflex:user",
      JSON.stringify({ id: value, phone: "+2348000000000", stellarPublicKey: "G".padEnd(56, "A") }),
    );
  }, user.id);

  await page.route(`${API_URL}/api/v1/wallet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        publicKey: "G".padEnd(56, "A"),
        balance: String(balances[role]),
        asset: "XLM",
        network: "testnet",
      }),
    }),
  );

  return page;
}

async function post(request: APIRequestContext, path: string, token: string) {
  const res = await request.post(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `${path} → ${res.status()}`).toBe(true);
  return (await res.json()) as { data: { status: string } };
}

async function expectStatus(page: Page, status: RegExp) {
  await page.goto(`/trades/${LIFECYCLE_TRADE_ID}`);
  await expect(page.locator("article").getByText(status).first()).toBeVisible({ timeout: 10_000 });
}

async function expectBalance(page: Page, value: number) {
  await page.goto("/wallet");
  await expect(page.getByText(naira(value)).first()).toBeVisible({ timeout: 10_000 });
}

test.describe("Trade lifecycle", () => {
  test.setTimeout(90_000);

  test("listing → escrow deposit → payment confirmation → release", async ({ browser, request }) => {
    await request.post(`${API_URL}/__e2e/lifecycle/reset`);
    balances.seller = 1000;
    balances.buyer = 10_000;

    const sellerToken = testJwt({ sub: SELLER.sub });
    const buyerToken = testJwt({ sub: BUYER.sub });

    const sellerContext = await browser.newContext();
    const buyerContext = await browser.newContext();

    try {
      const seller = await openAs(sellerContext, SELLER, "seller");
      const buyer = await openAs(buyerContext, BUYER, "buyer");

      // 1. Seller creates the listing.
      await mockCreateListing(seller, LIFECYCLE_TRADE_ID);
      await seller.goto("/sell");
      await seller.locator("#assetType").selectOption({ index: 1 }).catch(async () => {
        await seller.locator("#assetType").fill("MTN");
      });
      await seller.locator("#amount").fill(String(AMOUNT));
      const expiry = seller.locator("#expiresInHours");
      if (await expiry.count()) await expiry.fill("24");
      await seller.locator('button[type="submit"]').click();
      await expect(
        seller.getByText(new RegExp(`${LIFECYCLE_TRADE_ID}|listing created|success`, "i")).first(),
      ).toBeVisible({ timeout: 10_000 });

      await expectStatus(seller, /^Open$/);
      await expectStatus(buyer, /^Open$/);

      // 2. Buyer deposits into escrow.
      const locked = await post(request, `/api/v1/trades/${LIFECYCLE_TRADE_ID}/buy`, buyerToken);
      expect(locked.data.status).toBe("Locked");
      balances.buyer -= AMOUNT;

      await expectStatus(buyer, /^Locked$/);
      await expect(buyer.getByText(/escrow locked/i)).toBeVisible();
      await expectStatus(seller, /^Locked$/);
      await expect(seller.getByText(/escrow locked/i)).toBeVisible();
      await expectBalance(buyer, balances.buyer);

      // 3. Payment confirmed — funds stay in escrow until release.
      const confirmed = await post(
        request,
        `/api/v1/trades/${LIFECYCLE_TRADE_ID}/confirm-payment`,
        sellerToken,
      );
      expect(confirmed.data.status).toBe("Locked");
      await expectStatus(seller, /^Locked$/);
      await expectBalance(seller, balances.seller);

      // 4. Escrow released to the seller, net of the fee.
      const released = await post(request, `/api/v1/trades/${LIFECYCLE_TRADE_ID}/release`, buyerToken);
      expect(released.data.status).toBe("Completed");
      balances.seller += SELLER_NET;

      await expectStatus(seller, /^Completed$/);
      await expectStatus(buyer, /^Completed$/);

      await expectBalance(seller, 1000 + SELLER_NET);
      await expectBalance(buyer, 10_000 - AMOUNT);
    } finally {
      await sellerContext.close();
      await buyerContext.close();
    }
  });
});
