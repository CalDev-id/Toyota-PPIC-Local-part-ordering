"use client";

import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";

type DefaultLayoutProps = {
  children: React.ReactNode;
};

export default function DefaultLayout({ children }: DefaultLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">Live</div>
          </div>
        </header>

        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
