// Extend Express request and response-local types through declaration merging.
// See https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        phone: string;
        role: string;
        iat: number;
        exp: number;
      };
    }

    interface Locals {
      requestId: string;
    }
  }
}

export {};
