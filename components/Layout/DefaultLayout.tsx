"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Sidebar from "../Sidebar/Sidebar";

type DefaultLayoutProps = {
  children: React.ReactNode;
};

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const mounted = useMounted();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const profileName = mounted ? session?.user?.name || "Unknown User" : "Unknown User";
  const profileRole = mounted ? session?.user?.role || "-" : "-";
  const profileEmail = mounted ? session?.user?.email || "No email" : "No email";

  async function handleLogout() {
    setLoggingOut(true);
    setProfileOpen(false);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe_0%,_#eff6ff_35%,_#f8fafc_100%)]">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`transition-[margin] duration-300 ${collapsed ? "md:ml-20" : "md:ml-72"}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 px-4 py-7 backdrop-blur md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 md:hidden"
                aria-label="Open sidebar"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">Toyota Dashboard</p>
                <p className="text-xs text-slate-500">Layout with collapsible sidebar</p>
              </div>
            </div>
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600"
                aria-label="Open profile card"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-14 w-72 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
                  <div className="flex flex-col items-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
                      </svg>
                    </div>
                    <p className="mt-4 text-lg font-semibold text-slate-900">
                      {profileName}
                    </p>
                    <p className="mt-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {profileRole}
                    </p>
                    <p className="mt-3 break-all text-sm text-slate-600">
                      {profileEmail}
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
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
