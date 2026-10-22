/**
 * Stub API server for the e2e suite (Issue #30).
 *
 * Browser-level `page.route` intercepts cannot see fetches made by Next.js
 * Server Components — those run in the Node process and never touch the
 * browser. `/` and `/trades/[id]` render server-side, so they need a real
 * endpoint to talk to. This is it: a few fixtures over plain http, no
 * database and no blockchain.
 *
 * Client-side calls are still intercepted in-test, which keeps per-test
 * control (a cancelled payment, a changed balance) where it belongs.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 3001);

export const TEST_TRADE = {
  id: "trade_e2e_001",
  seller_id: "seller_1",
  seller_handle: "@stellar-raide-stellar-raide-airflex_2f9a",
  buyer_id: null,
  asset_type: "MTN",
  amount: 5000,
  fee_amount: 50,
  seller_net_amount: 4950,
  status: "Active",
  contract_listing_id: "listing_1",
  escrow_tx_hash: null,
  expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Lifecycle trade (Issue #531). Unlike TEST_TRADE its status is mutable, so the
 * full-lifecycle spec can move it Active → Locked → Completed and see each
 * stage rendered by the server-side trade page.
 */
export const LIFECYCLE_TRADE_ID = "trade_e2e_lifecycle";

function freshLifecycleTrade() {
  return {
    ...TEST_TRADE,
    id: LIFECYCLE_TRADE_ID,
    seller_id: "seller_e2e",
    buyer_id: null,
    status: "Active",
    payment_confirmed: false,
    escrow_tx_hash: null,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

let lifecycleTrade = freshLifecycleTrade();

function updateLifecycle(patch) {
  lifecycleTrade = { ...lifecycleTrade, ...patch, updated_at: new Date().toISOString() };
  return lifecycleTrade;
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }

  const lifecyclePath = `/api/v1/trades/${LIFECYCLE_TRADE_ID}`;

  if (url.pathname === "/__e2e/lifecycle/reset" && req.method === "POST") {
    lifecycleTrade = freshLifecycleTrade();
    return send(res, 200, { data: lifecycleTrade });
  }

  if (url.pathname === lifecyclePath) {
    return send(res, 200, { data: lifecycleTrade });
  }

  if (url.pathname === `${lifecyclePath}/buy` && req.method === "POST") {
    if (lifecycleTrade.status !== "Active") return send(res, 409, { error: "not active" });
    return send(res, 200, {
      data: updateLifecycle({
        status: "Locked",
        buyer_id: "buyer_e2e",
        escrow_tx_hash: "lifecycle_escrow_tx",
      }),
    });
  }

  if (url.pathname === `${lifecyclePath}/confirm-payment` && req.method === "POST") {
    if (lifecycleTrade.status !== "Locked") return send(res, 409, { error: "not locked" });
    return send(res, 200, { data: updateLifecycle({ payment_confirmed: true }) });
  }

  if (url.pathname === `${lifecyclePath}/release` && req.method === "POST") {
    if (lifecycleTrade.status !== "Locked" || !lifecycleTrade.payment_confirmed) {
      return send(res, 409, { error: "payment not confirmed" });
    }
    return send(res, 200, {
      data: updateLifecycle({ status: "Completed", release_tx_hash: "lifecycle_release_tx" }),
    });
  }

  if (url.pathname === `/api/v1/trades/${TEST_TRADE.id}`) {
    return send(res, 200, { data: TEST_TRADE });
  }

  if (url.pathname.startsWith("/api/v1/trades/") && url.pathname.endsWith("/buy")) {
    return send(res, 200, {
      data: { ...TEST_TRADE, status: "Locked", escrow_tx_hash: "abc123txhash" },
    });
  }

  // An unknown trade id must 404, so the not-found path stays testable.
  if (url.pathname.startsWith("/api/v1/trades/")) {
    return send(res, 404, { error: "not found" });
  }

  if (url.pathname === "/api/v1/trades") {
    if (req.method === "POST") return send(res, 201, { data: TEST_TRADE });
    return send(res, 200, { data: [TEST_TRADE] });
  }

  if (url.pathname === "/api/v1/wallet") {
    return send(res, 200, {
      publicKey: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      balance: "1000",
      asset: "XLM",
      network: "testnet",
    });
  }

  if (url.pathname.startsWith("/api/v1/auth")) {
    return send(res, 200, { success: true, token: "e2e-test-token", userId: "user_e2e" });
  }

  if (url.pathname === "/api/wallet/deposit/initialize") {
    return send(res, 200, { access_code: "ACCESS_CODE_E2E", reference: "ref_e2e_001" });
  }

  if (url.pathname === "/api/v1/profile") {
    return send(res, 200, {
      data: {
        id: "user_e2e",
        phone: "+2348000000000",
        role: "user",
        kycStatus: "verified",
      },
    });
  }

  if (url.pathname === "/health") return send(res, 200, { ok: true });

  return send(res, 404, { error: "not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`mock api listening on ${PORT}`);
});
