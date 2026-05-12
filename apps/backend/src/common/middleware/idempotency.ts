import type { NextFunction, Request, Response } from "express";

const seenKeys = new Set<string>();

export const idempotencyGuard = (req: Request, res: Response, next: NextFunction) => {
  const key = req.header("x-idempotency-key");

  if (!key) {
    return next();
  }

  if (seenKeys.has(key)) {
    return res.status(409).json({ message: "Duplicate idempotent request key" });
  }

  seenKeys.add(key);
  return next();
};
