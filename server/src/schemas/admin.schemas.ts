import { z } from "zod";

/**
 * Schema for POST /api/v1/admin/trades/:id/resolve request body.
 *
 * `resolution` selects the outcome of a disputed trade:
 *   - "RELEASE" → release escrowed funds to the seller.
 *   - "REFUND"  → return escrowed funds to the buyer.
 */
export const resolveDisputeSchema = z.object({
  resolution: z.enum(["RELEASE", "REFUND"]),
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;

/**
 * Schema for PATCH /api/v1/admin/fraud-flags/:id request body (issue #491).
 *
 * `status` closes an open flag:
 *   - "reviewed"  → investigated; action taken (or none needed) outside this API.
 *   - "dismissed" → false positive.
 */
export const reviewFraudFlagSchema = z.object({
  status: z.enum(["reviewed", "dismissed"]),
  note: z.string().trim().max(1000).optional(),
});

export type ReviewFraudFlagInput = z.infer<typeof reviewFraudFlagSchema>;
