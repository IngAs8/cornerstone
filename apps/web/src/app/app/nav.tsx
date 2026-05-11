"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "./actions";

interface NavItem { href: string; label: string; }

export function AppNav({
  items,
  appName,
  signOutLabel,
}: {
  items: NavItem[];
  appName: string;
  signOutLabel: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || (href !== "/app/dashboard" && pathname.startsWith(href));
  }

  const navLinks = (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`px-3 py-2 rounded-md text-sm transition-colors ${
            isActive(item.href)
              ? "bg-foreground/10 font-medium text-foreground"
              : "hover:bg-foreground/5 text-foreground/70 hover:text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-60 border-r border-foreground/10 hidden md:flex md:flex-col shrink-0">
        <div className="px-5 py-5 border-b border-foreground/10">
          <Link href="/app/dashboard" className="font-semibold tracking-tight">
            {appName}
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {navLinks}
        </nav>
        <form action={signOut} className="px-3 py-4 border-t border-foreground/10">
          <button
            type="submit"
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-foreground/5 transition-colors text-foreground/50"
          >
            {signOutLabel}
          </button>
        </form>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-foreground/10">
        <Link href="/app/dashboard" className="font-semibold tracking-tight text-sm">
          {appName}
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-md hover:bg-foreground/5 transition-colors"
          aria-label="Menu"
        >
          <span className="block w-5 h-0.5 bg-foreground mb-1"></span>
          <span className="block w-5 h-0.5 bg-foreground mb-1"></span>
          <span className="block w-5 h-0.5 bg-foreground"></span>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-background border-r border-foreground/10 flex flex-col h-full">
            <div className="px-5 py-5 border-b border-foreground/10 flex items-center justify-between">
              <span className="font-semibold tracking-tight text-sm">{appName}</span>
              <button onClick={() => setMobileOpen(false)} className="text-foreground/50 hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
              {navLinks}
            </nav>
            <form action={signOut} className="px-3 py-4 border-t border-foreground/10">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-foreground/5 transition-colors text-foreground/50"
              >
                {signOutLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
