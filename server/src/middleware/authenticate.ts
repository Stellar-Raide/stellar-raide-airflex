import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: string;
  phone: string;
  role: string;
  iat: number;
  exp: number;
  sub: string;        // user id
  stellarPublicKey: string;
}

/** Extends Express's Request so downstream handlers get req.user typed */
export interface AuthenticatedRequest extends Request {
  user: AuthPayload;
}

/**
 * Middleware that validates a Bearer JWT in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = header.slice(7);
  const secret = process.env["JWT_SECRET"]!;

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as unknown as AuthenticatedRequest).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token is invalid or expired" });
  }
}

/**
 * Like `authenticate`, but never rejects the request. If a valid Bearer JWT
 * is present, `req.user` is attached exactly as `authenticate` would; if the
 * header is missing, malformed, or the token is invalid/expired, the request
 * simply proceeds unauthenticated (no `req.user`).
 *
 * For endpoints that are public but return additional fields to a caller who
 * turns out to be a party to the resource (see GET /api/v1/trades/:id, which
 * only includes internal fee/settlement fields for the trade's own buyer or
 * seller).
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = header.slice(7);
  const secret = process.env["JWT_SECRET"]!;

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as unknown as AuthenticatedRequest).user = payload;
  } catch {
    // Invalid/expired token on a public endpoint — proceed anonymously
    // rather than rejecting the request.
  }

  next();
}
