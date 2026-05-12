import { Router } from "express";

export const authRouter = Router();

authRouter.get("/", (_req, res) => {
  res.json({ module: "auth", message: "Auth module scaffold" });
});
