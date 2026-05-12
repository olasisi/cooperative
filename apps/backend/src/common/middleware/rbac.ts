import type { NextFunction, Request, Response } from "express";
import { UserRole } from "@cooperative/contracts";
import { roleHierarchy } from "../rbac/roles.js";

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req.headers["x-role"] as UserRole | undefined) ?? UserRole.MEMBER;
    const allowedRoles = roleHierarchy[role];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${role}, current role: ${userRole}`
      });
    }

    return next();
  };
};
