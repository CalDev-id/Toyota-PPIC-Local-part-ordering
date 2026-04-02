"use client";

import type { AppRole } from "@/lib/roles";
import { useSession } from "next-auth/react";
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
    label: "Production",
    href: "/production",
    icon: (
          <svg
            className="fill-current"
            width="18"
            height="19"
            viewBox="0 0 18 19"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_130_9756)">
              <path
                d="M15.7501 0.55835H2.2501C1.29385 0.55835 0.506348 1.34585 0.506348 2.3021V15.8021C0.506348 16.7584 1.29385 17.574 2.27822 17.574H15.7782C16.7345 17.574 17.5501 16.7865 17.5501 15.8021V2.3021C17.522 1.34585 16.7063 0.55835 15.7501 0.55835ZM6.69385 10.599V6.4646H11.3063V10.5709H6.69385V10.599ZM11.3063 11.8646V16.3083H6.69385V11.8646H11.3063ZM1.77197 6.4646H5.45635V10.5709H1.77197V6.4646ZM12.572 6.4646H16.2563V10.5709H12.572V6.4646ZM2.2501 1.82397H15.7501C16.0313 1.82397 16.2563 2.04897 16.2563 2.33022V5.2271H1.77197V2.3021C1.77197 2.02085 1.96885 1.82397 2.2501 1.82397ZM1.77197 15.8021V11.8646H5.45635V16.3083H2.2501C1.96885 16.3083 1.77197 16.0834 1.77197 15.8021ZM15.7501 16.3083H12.572V11.8646H16.2563V15.8021C16.2563 16.0834 16.0313 16.3083 15.7501 16.3083Z"
                fill=""
              />
            </g>
            <defs>
              <clipPath id="clip0_130_9756">
                <rect
                  width="18"
                  height="18"
                  fill="white"
                  transform="translate(0 0.052124)"
                />
              </clipPath>
            </defs>
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
  const { data: session } = useSession();

  const userRole = mounted ? (session?.user?.role as AppRole | undefined) : undefined;
  const visibleMenuItems = menuItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

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
              className={`overflow-hidden transition-all duration-300 ml-2 ${
                collapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100"
              }`}
            >
              <p className="text-3xl font-semibold">TOYOTA</p>
              <span className="text-slate-500">PAD - CCR Division</span>
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
