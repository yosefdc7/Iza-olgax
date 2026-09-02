"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Package,
  ReceiptText,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Truck,
  Loader2,
  LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
  onLinkClick?: () => void;
}

type NavKey =
  | "pos"
  | "products"
  | "suppliers"
  | "customers"
  | "sales"
  | "reports"
  | "settings";

interface NavItemDef {
  href: string;
  key: NavKey;
  icon: LucideIcon;
  roles: string[];
}

interface NavGroupDef {
  id: string;
  items: NavItemDef[];
}

const mainNavGroups: NavGroupDef[] = [
  // Group 1: Store Operations (POS & Products)
  {
    id: "group-store-ops",
    items: [
      { href: "/pos", key: "pos", icon: ShoppingCart, roles: ["ADMIN", "CASHIER"] },
      { href: "/products", key: "products", icon: Package, roles: ["ADMIN"] },
    ],
  },
  // Group 2: Directory & Partners (Suppliers & Customers)
  {
    id: "group-directory",
    items: [
      { href: "/suppliers", key: "suppliers", icon: Truck, roles: ["ADMIN"] },
      { href: "/customers", key: "customers", icon: Users, roles: ["ADMIN", "CASHIER"] },
    ],
  },
  // Group 3: Analytics & Finance (Sales & Reports)
  {
    id: "group-analytics",
    items: [
      { href: "/sales", key: "sales", icon: ReceiptText, roles: ["ADMIN", "CASHIER"] },
      { href: "/reports", key: "reports", icon: BarChart3, roles: ["ADMIN"] },
    ],
  },
];

const settingsNavGroup: NavGroupDef = {
  id: "group-settings",
  items: [
    { href: "/settings", key: "settings", icon: Settings, roles: ["ADMIN"] },
  ],
};

export function AppSidebar({ user, onLinkClick }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const role = user.role ?? "CASHIER";
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Filter groups strictly based on the user's role
  const filterGroup = (group: NavGroupDef) => {
    const visibleItems = group.items.filter((item) => item.roles.includes(role));
    return visibleItems.length > 0 ? { ...group, items: visibleItems } : null;
  };

  const visibleGroups = mainNavGroups
    .map(filterGroup)
    .filter((g): g is NavGroupDef => g !== null);

  const visibleSettingsGroup = filterGroup(settingsNavGroup);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  const handleProfileClick = () => {
    router.push("/settings/profile");
    onLinkClick?.();
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/15 bg-sidebar text-sidebar-foreground select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/15 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/android-chrome-192x192.png"
          alt="Izah POS"
          className="h-9 w-9 rounded-xl object-contain shrink-0 ring-1 ring-white/20"
        />
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-white">Izah</span>
          <span className="text-[10px] font-extrabold tracking-widest uppercase text-sidebar-primary">
            POS System
          </span>
        </div>
      </div>

      {/* Main Navigation (Grouped sections separated by high-contrast line breakers) */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id}>
            {/* Visual line breaker between sections */}
            {groupIndex > 0 && (
              <div className="my-3 px-1">
                <div className="h-px w-full bg-white/20 dark:bg-white/20 shadow-xs" />
              </div>
            )}

            <div className="space-y-1">
              {group.items.map(({ href, key, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={false}
                    onClick={onLinkClick}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md font-semibold ring-1 ring-sidebar-primary/50"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{t(key)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Pinned Preferences & User Profile */}
      <div className="border-t border-white/15 p-3 space-y-2.5 bg-black/15">
        {visibleSettingsGroup && (
          <div className="space-y-1 pb-1">
            {visibleSettingsGroup.items.map(({ href, key, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={false}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm font-semibold"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{t(key)}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Line Breaker before Username */}
        <div className="h-px w-full bg-white/20 dark:bg-white/20" />

        {/* User Profile Card */}
        <button
          onClick={handleProfileClick}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shadow-xs">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-none truncate text-white">{user.name}</p>
            <p className="text-xs text-white/50 truncate mt-1">{user.email}</p>
          </div>
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
        >
          {isSigningOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
        </button>
      </div>
    </aside>
  );
}
