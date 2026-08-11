"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";

export default function TrackingPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const { data: me } = trpc.auth.me.useQuery();
  const orders = trpc.order.mine.useQuery(undefined, { enabled: !!me });

  const activeOrders =
    orders.data?.filter((o) =>
      ["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY"].includes(o.status),
    ) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Live Tracking</h1>
      <p className="mt-1 text-sm text-slate-500">
        Watch your courier move across campus in real time.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Track a specific order</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (orderId.trim()) router.push(`/orders/${orderId.trim()}`);
          }}
        >
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter order ID (e.g. cm12345abc)"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Track
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Hint: order IDs appear in your order URLs. You can also just open
          &quot;My Orders&quot;.
        </p>
      </div>

      {me && activeOrders.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-slate-900">Active deliveries</h2>
          <div className="mt-3 space-y-3">
            {activeOrders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    Order #{o.orderNumber}
                  </p>
                  <p className="text-sm text-slate-500">
                    {o.zone?.name} · {o.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  LIVE
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white">
        <h2 className="text-lg font-bold">How Micro Hub tracking works</h2>
        <ol className="mt-3 space-y-2 text-sm text-indigo-100">
          <li>1. Your order is confirmed & a campus courier is assigned.</li>
          <li>2. The courier picks up from the micro-vendor (e.g. Canteen).</li>
          <li>3. You watch them move on the live map, zone by zone.</li>
          <li>4. Arriving at your hostel block → knock, knock 🚪✨</li>
        </ol>
      </div>
    </div>
  );
}
