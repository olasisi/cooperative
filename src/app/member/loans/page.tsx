"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanRequestSchema, type LoanRequestInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

interface LoanData {
  id: string;
  amount: number;
  purpose: string;
  tenure: number;
  status: string;
  isRepaid: boolean;
  createdAt: string;
}

interface SuretyRequest {
  id: string;
  loanId: string;
  borrowerName: string;
  amount: number;
  status: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

export default function LoansPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [sureties, setSureties] = useState<SuretyRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LoanRequestInput>({
    resolver: zodResolver(loanRequestSchema),
  });

  useEffect(() => {
    fetchLoans();
    fetchSureties();
    fetchMembers();
  }, []);

  const fetchLoans = async () => {
    const res = await fetch("/api/member/loans");
    const data = await res.json();
    if (data.success) setLoans(data.data);
  };

  const fetchSureties = async () => {
    const res = await fetch("/api/member/surety");
    const data = await res.json();
    if (data.success) setSureties(data.data);
  };

  const fetchMembers = async () => {
    const res = await fetch("/api/member/list");
    const data = await res.json();
    if (data.success) setMembers(data.data);
  };

  const onSubmit = async (data: LoanRequestInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Loan request submitted" });
        reset();
        fetchLoans();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSuretyAction = async (suretyId: string, action: "ACCEPT" | "DECLINE") => {
    const res = await fetch("/api/member/surety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suretyId, action }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: `Surety ${action.toLowerCase()}ed` });
      fetchSureties();
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const statusVariant: Record<string, "default" | "success" | "destructive" | "warning" | "info"> = {
    PROPOSED: "warning",
    REVIEWED: "info",
    APPROVED: "success",
    EXECUTED: "success",
    REJECTED: "destructive",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Loans</h1>
        <p className="text-muted-foreground">Apply for and manage loans</p>
      </div>

      {sureties.filter((s) => s.status === "PENDING").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-700">Pending Surety Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sureties
                  .filter((s) => s.status === "PENDING")
                  .map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.borrowerName}</TableCell>
                      <TableCell>{formatCurrency(s.amount)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSuretyAction(s.id, "ACCEPT")}>
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleSuretyAction(s.id, "DECLINE")}
                          >
                            Decline
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apply for a Loan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₦)</Label>
                <Input type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tenure (months)</Label>
                <Input type="number" {...register("tenure", { valueAsNumber: true })} />
                {errors.tenure && <p className="text-xs text-destructive">{errors.tenure.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Input {...register("purpose")} placeholder="Describe the purpose of the loan" />
              {errors.purpose && <p className="text-xs text-destructive">{errors.purpose.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Surety (Select a member)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("suretyId")}
              >
                <option value="">Select surety...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </option>
                ))}
              </select>
              {errors.suretyId && <p className="text-xs text-destructive">{errors.suretyId.message}</p>}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Loan Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No loan requests yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Tenure</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Repaid</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs">{loan.purpose}</TableCell>
                    <TableCell>{loan.tenure}m</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[loan.status] ?? "default"}>{loan.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loan.isRepaid ? "success" : "warning"}>
                        {loan.isRepaid ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(loan.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
