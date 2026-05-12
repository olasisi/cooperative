export enum UserRole {
  MEMBER = "MEMBER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
  AUDITOR = "AUDITOR"
}

export enum RequestWorkflowStatus {
  PROPOSED = "PROPOSED",
  REVIEWED = "REVIEWED",
  APPROVED = "APPROVED",
  EXECUTED = "EXECUTED",
  LOGGED = "LOGGED",
  REJECTED = "REJECTED"
}

export enum TransactionType {
  CONTRIBUTION = "CONTRIBUTION",
  WITHDRAWAL = "WITHDRAWAL",
  LOAN_DISBURSEMENT = "LOAN_DISBURSEMENT",
  LOAN_REPAYMENT = "LOAN_REPAYMENT",
  ADJUSTMENT = "ADJUSTMENT"
}

export enum WalletEntryDirection {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT"
}

export type ApprovalRule = {
  threshold: number;
  allowSelfApproval: false;
};

export type Money = {
  amountMinor: number;
  currency: string;
};
