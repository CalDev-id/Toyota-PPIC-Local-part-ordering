"use client";

import type { AppRole } from "@/lib/roles";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: AppRole[];
};

const menuItems: MenuItem[] = [
  {
    label: "Home",
    href: "/",
    icon: (
          <svg
            className="fill-current"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 10L12 3L21 10V20C21 20.55 20.55 21 20 21H15C14.45 21 14 20.55 14 20V16C14 15.45 13.55 15 13 15H11C10.45 15 10 15.45 10 16V20C10 20.55 9.55 21 9 21H4C3.45 21 3 20.55 3 20V10Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
    ),
  },
  {
    label: "Analysis",
    href: "/analysis",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20h16" />
        <path d="M7 16v-4M12 16V8M17 16v-6" />
      </svg>
    ),
  },
    {
    label: "Planning",
    href: "/planning",
    roles: ["ADMIN", "ORDERING"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v14H4z" />
        <path d="M8 3v6M16 3v6" />
        <path d="M4 10h16" />
        <path d="M8 14h3M8 18h8" />
      </svg>
    ),
  },
  {
    label: "Ordering",
    href: "/ordering",
    roles: ["ADMIN", "ORDERING"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7.5h16" />
        <path d="M7 4.5v6" />
        <path d="M17 4.5v6" />
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Manage Order",
    href: "/manage-order",
    roles: ["ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h5" />
        <path d="m15 17 4-4" />
        <path d="m16 13 3 3" />
      </svg>
    ),
  },
  {
    label: "Recap",
    href: "/recap",
    roles: ["ADMIN", "ORDERING"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Stock",
    href: "/ordering/stock",
    roles: ["ADMIN", "ORDERING"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7.5 12 3l8 4.5-8 4.5L4 7.5Z" />
        <path d="M4 7.5v9L12 21l8-4.5v-9" />
        <path d="M12 12v9" />
      </svg>
    ),
  },
  {
    label: "Delivery",
    href: "/delivery",
    roles: ["ADMIN", "DELIVERY"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7h10v10H3z" />
        <path d="M13 10h3l3 3v4h-6" />
        <circle cx="8" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Receiving",
    href: "/receiving",
    roles: ["ADMIN", "RECEIVING"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h11v10H4z" />
        <path d="M15 10h2.5l2.5 2.5V17h-5" />
        <path d="M7 17h5" />
        <circle cx="8" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Tracking",
    href: "/tracking",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 7h10v8H3z" />
        <path d="M13 10h3l3 3v2h-6" />
        <circle cx="8" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/users",
    roles: ["ADMIN"],
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="9" r="3" />
        <path d="M19 19a3 3 0 0 0-2.2-2.88" />
        <path d="M17 7.5a2.5 2.5 0 0 1 0 5" />
      </svg>
    ),
  },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const mounted = useMounted();
  const pathname = usePathname();
  const { data: session, status: authStatus } = useSession();

  const userRole = mounted ? (session?.user?.role as AppRole | undefined) : undefined;
  const visibleMenuItems =
    mounted && authStatus === "authenticated" && userRole
      ? menuItems.filter((item) => !item.roles || item.roles.includes(userRole))
      : [];

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-white text-red-600 transition-transform duration-300 md:z-40 md:translate-x-0 ${
          collapsed ? "md:w-20" : "md:w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex items-center px-3 py-5 ${
              collapsed ? "justify-center py-2" : "justify-between py-3"
            }`}
          >
            <div
              className={`overflow-hidden transition-all duration-300 ml-0 ${
                collapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100"
              }`}
            >
              <Image
                src="/image/tmmin_logo.png"
                alt="TMMIN"
                width={150}
                height={42}
                priority
                className="-ml-5 h-20 w-auto object-contain"
              />
              {/* <span className="text-slate-500">PAD - CCR Division</span> */}
            </div>

            {/* CLOSE BUTTON */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden rounded-lg border border-slate-300/70 p-1.5 text-slate-500 transition hover:border-[#049f57] hover:text-[#049f57] md:inline-flex"
                aria-label="Toggle sidebar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg border border-slate-300/70 p-1.5 text-slate-500 transition hover:border-[#049f57] hover:text-[#049f57] md:hidden"
                aria-label="Close sidebar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          {/* MENU ITEMS */}
          <nav className="flex-1 space-y-2 p-3">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                    isActive
                      ? "bg-[#d9fcf3] text-slate-500"
                      : "text-slate-500 hover:bg-black/5 hover:text-slate-500"
                  } ${collapsed ? "md:justify-center" : ""}`}
                >
                  <span className={isActive ? "text-slate-500" : "text-slate-400 group-hover:text-slate-500"}>
                    {item.icon}
                  </span>
                  <span className={`text-md font-medium ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className={`border-t border-white/10 p-4 text-xs text-slate-400 ${collapsed ? "md:text-center" : ""}`}>
            {collapsed ? "v1" : "Dashboard v1.0"}
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[1px] md:hidden"
          aria-label="Close sidebar overlay"
        />
      )}
    </>
  );
}

function useMounted() {
  return useSyncExternalStore(subscribeToMount, getClientSnapshot, getServerSnapshot);
}

function subscribeToMount() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}
