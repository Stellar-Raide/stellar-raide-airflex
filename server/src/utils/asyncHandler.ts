import { Request, Response, NextFunction } from "express";

/**
 * Wraps an async Express route handler so any thrown error or rejected promise
 * is forwarded to the global error-handling middleware via `next(err)`.
 *
 * Without this wrapper every async handler would need its own try/catch to
 * avoid unhandled rejections silently swallowing errors.
 *
 * Usage:
 *   router.get("/", asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
