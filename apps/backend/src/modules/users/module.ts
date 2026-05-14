import { Router } from "express";
import { requireRole } from "../../common/middleware/rbac.js";
import { UserRole } from "@cooperative/contracts";

export const usersRouter = Router();

usersRouter.get("/", requireRole(UserRole.ADMIN), (_req, res) => {
  res.json({ module: "users", message: "Users module scaffold" });
});
