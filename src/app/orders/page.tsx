"use client";

import Link from "next/link";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiTruck } from "react-icons/fi";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-sky-100 text-sky-700",
  CONFIRMED: "bg-sky-100 text-sky-700",
  PACKED: "bg-indigo-100 text-indigo-700",
  OUT_FOR_DELIVERY: "bg-violet-100 text-violet-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default function OrdersPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const orders = trpc.order.mine.useQuery(undefined, { enabled: !!me });

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">📦</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Sign in to see your orders
        </h1>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const list = orders.data ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
      <p className="text-sm text-slate-500">Track and manage all your campus orders.</p>

      {orders.isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-5xl">🛍️</p>
          <p className="mt-3 font-semibold text-slate-700">No orders yet</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((order) => {
            const firstItem = order.items[0];
            const count = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                {firstItem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstItem.imageUrl}
                    alt={firstItem.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
                    <FiTruck className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      Order #{order.orderNumber}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyles[order.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {firstItem?.name}
                    {count > 1 ? ` +${count - 1} more items` : ""}
                    {order.zone ? ` · 📍 ${order.zone.name}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {order.scheduledSlot ? ` · 🕐 ${order.scheduledSlot}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatINR(order.total)}</p>
                  <p className="text-xs text-indigo-600">Track →</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
