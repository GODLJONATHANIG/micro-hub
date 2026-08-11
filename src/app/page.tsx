"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "./providers";
import ProductCard from "@/components/ProductCard";
import {
  FiSearch,
  FiMapPin,
  FiClock,
  FiUsers,
  FiZap,
  FiShield,
} from "react-icons/fi";

const features = [
  {
    icon: FiMapPin,
    title: "Zone-based campus delivery",
    desc: "Order to your hostel block or academic zone. We route couriers by micro-zones.",
  },
  {
    icon: FiUsers,
    title: "Split bills with roommates",
    desc: "Share an order link, friends join & split the bill. Everyone pays their share.",
  },
  {
    icon: FiClock,
    title: "Schedule between classes",
    desc: "Pick a delivery slot that fits your timetable — not the other way round.",
  },
  {
    icon: FiZap,
    title: "Micro-vendor network",
    desc: "Support student-run stalls & campus canteens, not just big chains.",
  },
  {
    icon: FiShield,
    title: "Verified student ID",
    desc: "Campus email verification unlocks student-only prices & deals.",
  },
  {
    icon: FiMapPin,
    title: "Live courier tracking",
    desc: "Watch your courier move across the campus map in real time.",
  },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);

  const { data: categories } = trpc.product.categories.useQuery();
  const { data: products, isLoading } = trpc.product.list.useQuery({
    search: search || undefined,
    category,
  });
  const { data: me } = trpc.auth.me.useQuery();

  return (
    <div className="flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              🎓 Built for students · Faster than your canteen queue
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Everything you need,
              <br />
              delivered to your{" "}
              <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                hostel room
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-indigo-100">
              Micro Hub is the micro-commerce platform for campus life. Stationery,
              snacks, electronics & hostel essentials from local vendors — pay online
              and watch your courier on a live map.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href="#store"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                Shop the campus store ↓
              </a>
              <Link
                href="/tracking"
                className="rounded-xl border border-white/30 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
              >
                See live tracking
              </Link>
            </div>
          </div>
          <div className="hidden flex-col justify-center lg:flex">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Live order · Out for delivery
                </span>
                <span className="text-indigo-200">#1024</span>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { done: true, label: "Order placed", sub: "2:41 PM" },
                  { done: true, label: "Payment confirmed", sub: "2:42 PM" },
                  { done: true, label: "Packed at Canteen", sub: "2:48 PM" },
                  { done: true, label: "Out for delivery", sub: "2:52 PM" },
                  { done: false, label: "Arriving to Hostel A · Room 214", sub: "~5 min" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        s.done ? "bg-emerald-400 text-emerald-900" : "bg-white/20 text-white"
                      }`}
                    >
                      {s.done ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium ${s.done ? "text-white" : "text-indigo-200"}`}
                      >
                        {s.label}
                      </p>
                      <p className="text-[11px] text-indigo-300">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UNIQUE FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">
          Why Micro Hub <span className="text-indigo-600">≠</span> Swiggy / Zomato
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Food apps deliver food. Micro Hub runs your whole campus errand economy.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg text-indigo-600">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STORE */}
      <section id="store" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">The Campus Store</h2>
            <p className="text-sm text-slate-500">
              {products?.length ?? 0} items from verified campus micro-vendors
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-indigo-500">
            <FiSearch className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notebooks, chips, chargers…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory(undefined)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              !category
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:border-indigo-400"
            }`}
          >
            All
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === c.slug ? undefined : c.slug)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                category === c.slug
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 bg-white text-slate-600 hover:border-indigo-400"
              }`}
            >
              {c.emoji} {c.name} · {c._count.products}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10 text-center text-slate-400">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 font-medium">No items match your search.</p>
          </div>
        )}

        {me && products && products.length > 0 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Tip: use &quot;Add →&quot; on any card to drop it into your cart instantly.
          </p>
        )}
      </section>
    </div>
  );
}
