import { Router } from "express";

export const loansRouter = Router();

loansRouter.get("/", (_req, res) => {
  res.json({ module: "loans", message: "Loans module scaffold" });
});
