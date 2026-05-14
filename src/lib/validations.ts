import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phoneNumber: z.string().min(10, "Enter a valid phone number"),
    address: z.string().optional(),
    nextOfKin: z.string().optional(),
    nextOfKinPhone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loanRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .min(1000, "Minimum loan amount is ₦1,000"),
  purpose: z.string().min(10, "Purpose must be at least 10 characters"),
  tenure: z
    .number({ invalid_type_error: "Tenure must be a number" })
    .int("Tenure must be a whole number")
    .min(1, "Minimum tenure is 1 month")
    .max(36, "Maximum tenure is 36 months"),
  suretyId: z.string().min(1, "Surety is required"),
});

export const withdrawalRequestSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .min(100, "Minimum withdrawal is ₦100"),
  reason: z.string().optional(),
  bankName: z.string().min(2, "Bank name is required"),
  accountNumber: z.string().length(10, "Account number must be 10 digits"),
  accountName: z.string().min(3, "Account name is required"),
});

export const duesPaymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .min(100, "Minimum dues amount is ₦100"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(new Date().getFullYear() - 5),
});

export const depositSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be positive")
    .min(100, "Minimum deposit is ₦100"),
});

export const suretyResponseSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  comment: z.string().optional(),
});

export const approvalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});

export const adjustmentSchema = z.object({
  userId: z.string().min(1, "User is required"),
  amount: z.number({ invalid_type_error: "Amount must be a number" }),
  type: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().min(5, "Reason is required"),
});

export const settingsSchema = z.object({
  minApprovals: z.number().int().min(1).max(5),
  suretyMultiplier: z.number().min(1).max(5),
  maxLoanMultiplier: z.number().min(1).max(10),
  interestRate: z.number().min(0).max(100),
  minMembershipMonths: z.number().int().min(0).max(24),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Enter a valid phone number").optional(),
  address: z.string().optional(),
  nextOfKin: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoanRequestInput = z.infer<typeof loanRequestSchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type DuesPaymentInput = z.infer<typeof duesPaymentSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type SuretyResponseInput = z.infer<typeof suretyResponseSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
