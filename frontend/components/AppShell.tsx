"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  Sparkles,
  LogOut,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/chat", label: "AI Assistant", icon: Sparkles },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user, loading, logout } = useAuth();

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <HeartPulse className="w-8 h-8 text-indigo-400" />
          <p className="text-white/40 text-sm">Loading LifeOS…</p>
        </div>
      </div>
    );
  }

  const initials = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <nav
        className="hidden md:flex w-64 glass-panel border-r border-white/5 flex-col p-6 h-screen sticky top-0 z-40"
        aria-label="Primary navigation"
      >
        <div className="mb-12 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
            <span className="text-xl">☀️</span>
          </div>
          <h1 className="text-xl font-bold gradient-text-premium tracking-tight">LifeOS</h1>
        </div>

        <div className="space-y-2 flex-1 px-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-white/10 text-white font-medium shadow-sm"
                    : "hover:bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-indigo-400" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/10">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">
                {user.name || user.email.split("@")[0]}
              </h3>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Log out"
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 w-full max-w-full overflow-x-hidden relative">
        <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h1 className="text-lg font-bold gradient-text-premium leading-none">LifeOS</h1>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="mx-auto w-full min-h-screen">{children}</main>

        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 p-4 z-40"
          aria-label="Mobile primary navigation"
        >
          <div className="glass-panel w-full rounded-2xl flex justify-around items-center p-3 border border-white/10 shadow-2xl">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    active ? "text-indigo-400" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
