import { Router } from "express";
import { env } from "../../config/env.js";

export const approvalsRouter = Router();

approvalsRouter.get("/", (_req, res) => {
  res.json({
    module: "approvals",
    message: "Approvals module scaffold",
    approvalThreshold: env.APPROVAL_THRESHOLD,
    allowSelfApproval: env.ALLOW_SELF_APPROVAL
  });
});
