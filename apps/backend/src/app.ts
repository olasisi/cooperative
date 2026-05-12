import express from "express";
import { idempotencyGuard } from "./common/middleware/idempotency.js";
import { authRouter } from "./modules/auth/module.js";
import { usersRouter } from "./modules/users/module.js";
import { walletsRouter } from "./modules/wallets/module.js";
import { loansRouter } from "./modules/loans/module.js";
import { approvalsRouter } from "./modules/approvals/module.js";
import { auditRouter } from "./modules/audit/module.js";
import { settingsRouter } from "./modules/settings/module.js";

export const app = express();

app.use(express.json());
app.use(idempotencyGuard);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "cooperative-backend" });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/wallets", walletsRouter);
app.use("/loans", loansRouter);
app.use("/approvals", approvalsRouter);
app.use("/audit", auditRouter);
app.use("/settings", settingsRouter);
