# API Reference

Base URL: `http://localhost:3001` (development)

All request and response bodies are JSON. Authenticated endpoints require a
`Bearer` JWT in the `Authorization` header.

---

## Authentication

### Token format

```
Authorization: Bearer <jwt>
```

The JWT payload must contain:

```json
{
  "sub": "<user_id>",
  "stellarPublicKey": "<G...>"
}
```

Invalid or expired tokens return `401`:

```json
{ "error": "Token is invalid or expired" }
```

---

## Health Check

### `GET /health`

Returns server status. No authentication required.

**Response `200`**

```json
{
  "status": "ok",
  "timestamp": "2026-08-02T10:00:00.000Z"
}
```

---

## Trades

### `GET /api/trades`

Returns paginated active trade listings. No authentication required.

**Query parameters**

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `page` | integer | `1` | min 1 | Page number |
| `limit` | integer | `20` | min 1, max 100 | Results per page |

**Response `200`**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "seller_id": "a1b2c3d4-...",
      "buyer_id": null,
      "asset_type": "MTN_AIRTIME",
      "amount": 500,
      "status": "Active",
      "contract_listing_id": "1",
      "escrow_tx_hash": null,
      "expires_at": "2026-08-03T10:00:00.000Z",
      "created_at": "2026-08-02T10:00:00.000Z",
      "updated_at": "2026-08-02T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Response `400`** — invalid query params

```json
{
  "error": "Invalid query parameters",
  "details": { "limit": ["Number must be less than or equal to 100"] }
}
```

---

### `POST /api/trades` 🔒

Creates a new trade offer. Registers the listing on the Soroban escrow contract
and stores the record in PostgreSQL.

**Request body**

```json
{
  "assetType": "MTN_AIRTIME",
  "amount": 500,
  "expiresInHours": 24
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `assetType` | string | 1–50 chars, alphanumeric + `_-` | The telecom asset being sold |
| `amount` | number | positive | Token amount the buyer must pay |
| `expiresInHours` | integer | 1–168 | Hours until the listing expires |

**Response `201`**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "seller_id": "a1b2c3d4-...",
    "buyer_id": null,
    "asset_type": "MTN_AIRTIME",
    "amount": 500,
    "status": "Active",
    "contract_listing_id": "7",
    "escrow_tx_hash": null,
    "expires_at": "2026-08-03T10:00:00.000Z",
    "created_at": "2026-08-02T10:00:00.000Z",
    "updated_at": "2026-08-02T10:00:00.000Z"
  }
}
```

**Response `400`** — validation error or wallet not found

```json
{
  "error": "Validation failed",
  "details": {
    "amount": ["Number must be greater than 0"]
  }
}
```

**Response `401`** — missing or invalid token

```json
{ "error": "Missing or invalid Authorization header" }
```

---

### `GET /api/trades/:id`

Returns a single trade offer by ID. No authentication required.

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID string | Trade offer ID |

**Response `200`**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "seller_id": "a1b2c3d4-...",
    "buyer_id": "f5e6d7c8-...",
    "asset_type": "MTN_AIRTIME",
    "amount": 500,
    "status": "Locked",
    "contract_listing_id": "7",
    "escrow_tx_hash": "abc123...",
    "expires_at": "2026-08-03T10:00:00.000Z",
    "created_at": "2026-08-02T10:00:00.000Z",
    "updated_at": "2026-08-02T11:00:00.000Z"
  }
}
```

**Response `404`**

```json
{ "error": "Trade offer not found" }
```

---

### `POST /api/trades/:id/buy` 🔒

Locks the buyer's escrow funds on-chain by calling `deposit_to_escrow` on the
Soroban contract. Updates the trade status to `Locked`.

**Path parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID string | Trade offer ID to purchase |

**Request body**

```json
{
  "buyerSecretKey": "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `buyerSecretKey` | string | exactly 56 chars | Buyer's Stellar secret key for signing the escrow transaction |

> **Security note:** Passing a raw secret key to the server is a placeholder
> for the initial implementation. The production pattern is client-side signing —
> the client signs the XDR transaction and submits the signed envelope to the
> server instead.

**Response `200`**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "seller_id": "a1b2c3d4-...",
    "buyer_id": "f5e6d7c8-...",
    "asset_type": "MTN_AIRTIME",
    "amount": 500,
    "status": "Locked",
    "contract_listing_id": "7",
    "escrow_tx_hash": "7e64c225fc8be42f...",
    "expires_at": "2026-08-03T10:00:00.000Z",
    "created_at": "2026-08-02T10:00:00.000Z",
    "updated_at": "2026-08-02T11:30:00.000Z"
  }
}
```

**Response `400`** — trade not active, no contract listing, or seller trying to buy own trade

```json
{ "error": "Trade is not available for purchase (status: Locked)" }
```

**Response `401`** — missing or invalid token

```json
{ "error": "Missing or invalid Authorization header" }
```

**Response `404`** — trade not found

```json
{ "error": "Trade offer not found" }
```

---

## Error Format

All errors follow this shape:

```json
{
  "error": "Human-readable message"
}
```

Validation errors include a `details` field:

```json
{
  "error": "Validation failed",
  "details": {
    "<field>": ["<message>"]
  }
}
```

Unhandled server errors return `500`:

```json
{ "error": "Internal server error" }
```

---

## Status Codes Summary

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad request — validation failed or business rule violated |
| `401` | Unauthorized — missing or invalid JWT |
| `404` | Not found |
| `500` | Internal server error |
