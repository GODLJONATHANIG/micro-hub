"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/app/providers";
import { FiShoppingCart, FiUser, FiLogOut, FiPackage } from "react-icons/fi";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: me } = trpc.auth.me.useQuery();
  const cart = trpc.cart.get.useQuery(undefined, { enabled: !!me });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  const cartCount = cart.data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  const linkCls = (path: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      pathname === path
        ? "bg-indigo-50 text-indigo-700"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-bold text-white shadow-sm">
            M
          </span>
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight">
              micro<span className="text-indigo-600">hub</span>
            </span>
            <p className="hidden text-[10px] font-medium uppercase tracking-widest text-slate-400 sm:block">
              campus micro-commerce
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className={linkCls("/")}>
            Store
          </Link>
          <Link href="/orders" className={linkCls("/orders")}>
            My Orders
          </Link>
          <Link href="/split" className={linkCls("/split")}>
            Split Bills
          </Link>
          <Link href="/tracking" className={linkCls("/tracking")}>
            Live Tracking
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100"
            aria-label="Cart"
          >
            <FiShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          {me ? (
            <div className="relative">
              <button
                onClick={() => setOpen((o) => !o)}
                className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <FiUser className="h-4 w-4" />
                <span className="hidden sm:inline">{me.name.split(" ")[0]}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-2">
                    <p className="truncate text-sm font-semibold">{me.name}</p>
                    <p className="truncate text-xs text-slate-500">{me.email}</p>
                    {me.emailVerified && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        ✓ Verified Student
                      </span>
                    )}
                  </div>
                  <Link
                    href="/orders"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FiPackage className="h-4 w-4" /> My Orders
                  </Link>
                  <button
                    onClick={() => logout.mutate()}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FiLogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
