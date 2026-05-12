import { Router } from "express";
import { env } from "../../config/env.js";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
  res.json({
    module: "settings",
    approvalThreshold: env.APPROVAL_THRESHOLD,
    allowSelfApproval: env.ALLOW_SELF_APPROVAL
  });
});
