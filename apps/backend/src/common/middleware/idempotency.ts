import type { NextFunction, Request, Response } from "express";

const seenKeys = new Map<string, number>();
const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

export const idempotencyGuard = (req: Request, res: Response, next: NextFunction) => {
  const key = req.header("x-idempotency-key");

  if (!key) {
    return next();
  }

  const now = Date.now();
  for (const [existingKey, keyExpiresAt] of seenKeys) {
    if (keyExpiresAt <= now) {
      seenKeys.delete(existingKey);
    }
  }
  const expiresAt = seenKeys.get(key);
  if (expiresAt && expiresAt > now) {
    return res.status(409).json({
      message: "Duplicate request detected. This idempotency key was already used within the last 10 minutes"
    });
  }

  seenKeys.set(key, now + TEN_MINUTES_IN_MS);
  return next();
};
