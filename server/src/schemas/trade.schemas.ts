import { z } from "zod";

/**
 * Schema for POST /api/trades (create listing)
 *
 * Matches the server-side Zod rules AND the frontend sell form validation so
 * both layers share a single source of truth (this file is the canonical one).
 */
export const createTradeSchema = z.object({
  assetType: z
    .string({ required_error: "assetType is required" })
    .min(1, "assetType is required")
    .max(50, "assetType must be 50 characters or fewer")
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "assetType must contain only letters, numbers, underscores, or hyphens"
    ),

  amount: z
    .number({ required_error: "amount is required", invalid_type_error: "amount must be a number" })
    .positive("amount must be greater than 0"),

  expiresInHours: z
    .number({ required_error: "expiresInHours is required", invalid_type_error: "expiresInHours must be a number" })
    .int("expiresInHours must be a whole number")
    .min(1, "minimum expiry is 1 hour")
    .max(168, "maximum expiry is 7 days (168 hours)"),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

// ---------------------------------------------------------------------------

/**
 * Schema for POST /api/trades/:id/buy
 *
 * NOTE: The buyerSecretKey field is a placeholder for the initial
 * implementation. Production flow should use client-side XDR signing.
 */
export const buyTradeSchema = z.object({
  buyerSecretKey: z
    .string({ required_error: "buyerSecretKey is required" })
    .length(56, "buyerSecretKey must be exactly 56 characters (Stellar secret key format)"),
});

export type BuyTradeInput = z.infer<typeof buyTradeSchema>;

// ---------------------------------------------------------------------------

/**
 * Schema for GET /api/trades query parameters (pagination)
 *
 * This schema is applied to req.query, not req.body.
 * Strings are coerced to integers via transform().
 */
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1, "page must be at least 1")),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(
      z
        .number()
        .int()
        .min(1, "limit must be at least 1")
        .max(100, "limit must be 100 or fewer")
    ),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
