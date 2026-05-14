"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Bell, User } from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  userName?: string;
  role?: string;
}

export function Header({ userName, role }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome back, <span className="font-medium text-foreground">{userName}</span>
        </span>
        {role && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {role}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={role === "ADMIN" ? "/admin" : "/member/profile"}>
            <User className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
