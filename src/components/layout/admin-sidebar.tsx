"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  CreditCard,
  BarChart3,
  Settings,
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/admin/loans", label: "Loans", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r bg-slate-900 text-white">
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-white text-lg">
          CoopAdmin
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {adminNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href || (href !== "/admin" && pathname.startsWith(href))
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
