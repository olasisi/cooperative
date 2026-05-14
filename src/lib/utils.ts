import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Numeric = number | { toNumber(): number };

function toNum(value: Numeric): number {
  return typeof value === "number" ? value : value.toNumber();
}

export function formatCurrency(amount: Numeric): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(toNum(amount));
}

export function computeAvailableBalance(totalBalance: Numeric, lockedBalance: Numeric): number {
  return Math.max(0, toNum(totalBalance) - toNum(lockedBalance));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateReference(prefix = "REF"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateMembershipNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(4, "0");
  return `COOP-${year}-${padded}`;
}

export function calculateLoanRepayment(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): { totalRepayable: number; monthlyRepayment: number } {
  const monthlyRate = annualInterestRate / 100 / 12;
  let monthlyRepayment: number;
  let totalRepayable: number;

  if (monthlyRate === 0) {
    monthlyRepayment = principal / tenureMonths;
    totalRepayable = principal;
  } else {
    monthlyRepayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, tenureMonths))) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    totalRepayable = monthlyRepayment * tenureMonths;
  }

  return {
    totalRepayable: Math.round(totalRepayable * 100) / 100,
    monthlyRepayment: Math.round(monthlyRepayment * 100) / 100,
  };
}

export function getMonthName(month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months[month - 1] || "";
}
