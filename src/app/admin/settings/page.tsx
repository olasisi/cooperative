"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema, type SettingsInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      minApprovals: 2,
      suretyMultiplier: 2,
      maxLoanMultiplier: 2,
      interestRate: 5,
      minMembershipMonths: 3,
    },
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) reset(data.data);
      });
  }, [reset]);

  const onSubmit = async (data: SettingsInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Settings saved" });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure cooperative rules and thresholds</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Cooperative Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Approvals Required</Label>
              <Input
                type="number"
                {...register("minApprovals", { valueAsNumber: true })}
              />
              {errors.minApprovals && (
                <p className="text-xs text-destructive">{errors.minApprovals.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Surety Multiplier (e.g., 2 = surety must have 2x loan amount)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("suretyMultiplier", { valueAsNumber: true })}
              />
              {errors.suretyMultiplier && (
                <p className="text-xs text-destructive">{errors.suretyMultiplier.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Max Loan Multiplier (e.g., 2 = max loan = 2x member balance)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("maxLoanMultiplier", { valueAsNumber: true })}
              />
              {errors.maxLoanMultiplier && (
                <p className="text-xs text-destructive">{errors.maxLoanMultiplier.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Annual Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                {...register("interestRate", { valueAsNumber: true })}
              />
              {errors.interestRate && (
                <p className="text-xs text-destructive">{errors.interestRate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Minimum Membership Duration (months) to apply for loan</Label>
              <Input
                type="number"
                {...register("minMembershipMonths", { valueAsNumber: true })}
              />
              {errors.minMembershipMonths && (
                <p className="text-xs text-destructive">{errors.minMembershipMonths.message}</p>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
