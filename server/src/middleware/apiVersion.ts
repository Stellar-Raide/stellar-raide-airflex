import { Request, Response, NextFunction } from "express";

/**
 * apiVersion middleware
 *
 * Attaches an `X-Api-Version` response header to every API response so that
 * clients can inspect which API version they are talking to without having
 * to parse the URL prefix.
 *
 * Register this middleware globally, before any route handlers.
 */
export function apiVersion(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader("X-Api-Version", "1");
  next();
}
