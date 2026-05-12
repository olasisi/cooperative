import {
  RequestWorkflowStatus,
  TransactionType,
  UserRole,
  WalletEntryDirection
} from "@cooperative/contracts";

export type User = {
  id: string;
  cooperativeId: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type Wallet = {
  id: string;
  userId: string;
  cooperativeId: string;
  currency: string;
  createdAt: string;
};

export type WalletLedgerEntry = {
  id: string;
  walletId: string;
  requestId: string;
  direction: WalletEntryDirection;
  amountMinor: number;
  transactionType: TransactionType;
  immutable: true;
  createdAt: string;
};

export type FinancialRequest = {
  id: string;
  proposerUserId: string;
  status: RequestWorkflowStatus;
  transactionType: TransactionType;
  idempotencyKey: string;
  createdAt: string;
};

export type ApprovalRecord = {
  id: string;
  requestId: string;
  reviewerUserId: string;
  approved: boolean;
  reason?: string;
  createdAt: string;
};
