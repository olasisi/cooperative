import { UserRole } from "@cooperative/contracts";

export const roleHierarchy: Record<UserRole, UserRole[]> = {
  [UserRole.MEMBER]: [UserRole.MEMBER],
  [UserRole.ADMIN]: [UserRole.MEMBER, UserRole.ADMIN],
  [UserRole.SUPER_ADMIN]: [UserRole.MEMBER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
  [UserRole.AUDITOR]: [UserRole.AUDITOR]
};
