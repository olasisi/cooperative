import { Router } from "express";

export const auditRouter = Router();

auditRouter.get("/", (_req, res) => {
  res.json({ module: "audit", message: "Audit logs module scaffold (append-only records)" });
});
