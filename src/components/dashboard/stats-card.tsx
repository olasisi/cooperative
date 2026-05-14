import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  isCurrency?: boolean;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  trend?: { value: number; label: string };
}

export function StatsCard({
  title,
  value,
  isCurrency = false,
  icon: Icon,
  description,
  className,
}: StatsCardProps) {
  const displayValue = isCurrency && typeof value === "number"
    ? formatCurrency(value)
    : value;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
