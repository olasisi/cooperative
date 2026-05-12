import { Router } from "express";

export const walletsRouter = Router();

walletsRouter.get("/", (_req, res) => {
  res.json({ module: "wallets", message: "Wallets module scaffold (ledger-first, immutable entries)" });
});
