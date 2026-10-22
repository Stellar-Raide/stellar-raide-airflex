import { Router, type Request, type Response } from "express";
import { cache } from "../services/cache";

const router = Router();

// Default exchange rate: 1 USDC = 1600 NGN
const DEFAULT_NGN_PER_USDC = 1600;

/**
 * GET /api/v1/rates
 * Returns conversion rate for fiat (NGN) to stablecoin (USDC).
 */
router.get("/", async (_req: Request, res: Response) => {
  const payload = await cache.remember("rates:NGN:USDC", Number(process.env.RATES_CACHE_TTL_SECONDS ?? 30), async () => {
    const rate = parseFloat(process.env["NGN_PER_USDC_RATE"] ?? "") || DEFAULT_NGN_PER_USDC;
    return {
    rate,
    base: "NGN",
    target: "USDC",
    data: {
      rate,
      base: "NGN",
      target: "USDC",
    },
    };
  });
  res.status(200).json(payload);
});

export default router;
