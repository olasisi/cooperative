"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { depositSchema, type DepositInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function WalletPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DepositInput>({
    resolver: zodResolver(depositSchema),
  });

  const onDeposit = async (data: DepositInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setPayUrl(result.data.authorization_url);
        reset();
        toast({ title: "Redirecting to payment..." });
        window.location.href = result.data.authorization_url;
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Deposit funds to your cooperative account</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Make a Deposit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onDeposit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="5000"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Deposit via Paystack"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
