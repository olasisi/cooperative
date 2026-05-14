import { Role, RequestStatus, TransactionType, TransactionStatus, SuretyStatus } from "@prisma/client";

export type { Role, RequestStatus, TransactionType, TransactionStatus, SuretyStatus };

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  address?: string | null;
  nextOfKin?: string | null;
  nextOfKinPhone?: string | null;
  membershipNumber?: string | null;
  membershipDate: Date;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletData {
  id: string;
  userId: string;
  totalBalance: number;
  lockedBalance: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionData {
  id: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description?: string | null;
  status: TransactionStatus;
  requestId?: string | null;
  requestType?: string | null;
  paystackRef?: string | null;
  createdAt: Date;
}

export interface LoanRequestData {
  id: string;
  borrowerId: string;
  amount: number;
  purpose: string;
  tenure: number;
  interestRate: number;
  totalRepayable?: number | null;
  monthlyRepayment?: number | null;
  status: RequestStatus;
  proposedById?: string | null;
  reviewedById?: string | null;
  approvedById?: string | null;
  executedById?: string | null;
  reviewedAt?: Date | null;
  approvedAt?: Date | null;
  executedAt?: Date | null;
  disbursedAt?: Date | null;
  dueDate?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  isRepaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WithdrawalRequestData {
  id: string;
  userId: string;
  amount: number;
  reason?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DuesRequestData {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: Date;
}

export interface SettingData {
  id: string;
  key: string;
  value: string;
  description?: string | null;
}

export interface ApprovalActionData {
  id: string;
  requestId: string;
  requestType: string;
  action: string;
  actorId: string;
  comment?: string | null;
  createdAt: Date;
}

export interface DashboardStats {
  totalBalance: number;
  lockedBalance: number;
  availableBalance: number;
  activeLoans: number;
  pendingApprovals: number;
  totalTransactions: number;
}

export interface AdminDashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalDeposits: number;
  totalLoans: number;
  pendingApprovals: number;
  totalBalance: number;
}

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
