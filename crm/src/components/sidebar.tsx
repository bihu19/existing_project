"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  Mail,
  Send,
  Settings,
  LogOut,
  UserCog,
  Columns3,
  MailPlus,
  FileText,
} from "lucide-react";

const navItems = [
  { href: "/accounts", label: "Accounts", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/email/templates", label: "Templates", icon: FileText },
  { href: "/email/send", label: "Send Email", icon: MailPlus },
  { href: "/email/campaigns", label: "Campaigns", icon: Send },
  { href: "/settings/users", label: "Users", icon: UserCog },
  { href: "/settings/fields", label: "Fields", icon: Columns3 },
  { href: "/settings/senders", label: "Senders", icon: Mail },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-[var(--card)]">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/accounts" className="text-lg font-bold">
          LiB CRM
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
