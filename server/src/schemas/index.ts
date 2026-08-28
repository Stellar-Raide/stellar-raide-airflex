/**
 * Central barrel export for all Zod request schemas.
 *
 * Import from here in route files:
 *   import { createTradeSchema, buyTradeSchema } from "../schemas";
 */

export {
  requestOtpSchema,
  verifyOtpSchema,
  type RequestOtpInput,
  type VerifyOtpInput,
} from "./auth.schemas";

export {
  createTradeSchema,
  buyTradeSchema,
  paginationSchema,
  type CreateTradeInput,
  type BuyTradeInput,
  type PaginationInput,
} from "./trade.schemas";

export {
  resolveDisputeSchema,
  type ResolveDisputeInput,
} from "./admin.schemas";
