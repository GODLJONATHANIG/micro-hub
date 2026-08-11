"use client";

import Link from "next/link";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiUsers } from "react-icons/fi";

export default function SplitPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const groups = trpc.group.mine.useQuery(undefined, { enabled: !!me });

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">👥</p>
        <h1 className="mt-3 text-2xl font-bold">Sign in to view your splits</h1>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const list = groups.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <FiUsers className="text-indigo-600" /> Split Bills
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Share an order with roommates — everyone pays their own share. No more
        &quot;transfer me your share&quot; awkwardness.
      </p>

      {groups.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-5xl">🤝</p>
          <p className="mt-3 font-semibold text-slate-700">No splits yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create one from any order page (&quot;Split the bill&quot; card).
          </p>
          <Link
            href="/orders"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Go to my orders
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((g) => {
            const myShare = g.members.find((m) => m.userId === me.id);
            const totalPaid = g.members.filter((m) => m.paid).length;
            return (
              <Link
                key={g.id}
                href={`/split/${g.shareCode}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    Split · Order #{g.order.orderNumber}
                  </p>
                  <p className="text-sm text-slate-500">
                    {g.order.items[0]?.name}
                    {g.order.items.length > 1
                      ? ` +${g.order.items.length - 1} more`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">
                    {formatINR(g.order.total)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {totalPaid}/{g.members.length} paid ·{" "}
                    {myShare?.paid ? "You paid ✓" : "Your share " + formatINR(myShare?.amount ?? 0)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
