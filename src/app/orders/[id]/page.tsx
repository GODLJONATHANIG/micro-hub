"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiCopy, FiUsers } from "react-icons/fi";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-slate-200" />
  ),
});

const typeLabels: Record<string, { label: string; icon: string }> = {
  PLACED: { label: "Order placed", icon: "🛒" },
  PAID: { label: "Payment confirmed", icon: "💳" },
  CONFIRMED: { label: "Order confirmed", icon: "✅" },
  PACKED: { label: "Packed & sealed", icon: "📦" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", icon: "🛵" },
  DELIVERED: { label: "Delivered", icon: "🎉" },
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: me } = trpc.auth.me.useQuery();
  const order = trpc.payment.track.useQuery(
    { orderId: id },
    {
      // Poll fast while the courier is moving so the map animates live
      refetchInterval: (query) =>
        query.state.data?.status === "OUT_FOR_DELIVERY" ||
        query.state.data?.status === "PACKED"
          ? 2500
          : 4000,
    },
  );

  useEffect(() => {
    // Silence the "not in my list" guard — track is public
    return undefined;
  }, []);

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">🔐</p>
        <h1 className="mt-3 text-2xl font-bold">Sign in to track</h1>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (order.isLoading || !order.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  const o = order.data;
  const destLat = o.zone?.lat ?? 12.9716;
  const destLng = o.zone?.lng ?? 77.5946;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/orders"
            className="text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            ← My orders
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Order #{o.orderNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {o.status === "OUT_FOR_DELIVERY" && (
            <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Courier live
            </span>
          )}
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
            {o.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* TIMELINE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Delivery timeline</h2>
          <div className="mt-4 space-y-0">
            {o.tracking.map((t, i) => {
              const isLast = i === o.tracking.length - 1;
              const meta = typeLabels[t.type] ?? { label: t.type, icon: "📌" };
              return (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white shadow">
                      {meta.icon}
                    </span>
                    {!isLast && <span className="w-0.5 flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-semibold text-slate-900">
                      {meta.label}
                    </p>
                    <p className="text-xs text-slate-500">{t.note}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(t.createdAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {o.status !== "DELIVERED" && o.status !== "CANCELLED" && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
              {o.status === "PENDING"
                ? "Waiting for payment…"
                : o.status === "PAID"
                  ? "Payment confirmed — the store is preparing your order."
                  : o.status === "OUT_FOR_DELIVERY"
                    ? "The courier is moving on the map right now! 🛵"
                    : "Hold tight — this page refreshes automatically."}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {/* MAP */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-bold text-slate-900">Live courier map</h2>
              <div className="flex items-center gap-2">
                {o.etaMinutes != null && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    ETA ~{o.etaMinutes} min
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-400">
                  {o.zone?.name ?? "Campus"}
                </span>
              </div>
            </div>
            <div className="relative h-80">
              <TrackingMap
                courierLat={o.courierLat || destLat}
                courierLng={o.courierLng || destLng}
                destLat={destLat}
                destLng={destLng}
                destinationLabel={o.zone?.name ?? "Destination"}
                courierActive={o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED"}
              />
              {o.status === "PENDING" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    ⏳ Waiting for payment to start tracking…
                  </span>
                </div>
              )}
              {o.status === "PAID" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    🛵 Courier is being assigned… (appears in ~15s)
                  </span>
                </div>
              )}
              {o.status === "CONFIRMED" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    📦 Packing your order…
                  </span>
                </div>
              )}
              {o.status === "PACKED" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    🛵 Courier leaving the store…
                  </span>
                </div>
              )}
              {o.status === "OUT_FOR_DELIVERY" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="flex items-center gap-2 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE — courier moving on the map
                  </span>
                </div>
              )}
              {o.status === "DELIVERED" && (
                <div className="absolute inset-x-0 top-0 flex justify-center p-3">
                  <span className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    🎉 Delivered to {o.zone?.name ?? "you"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ITEMS + SUMMARY */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Items</h2>
            <div className="mt-3 space-y-2">
              {o.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t border-dashed border-slate-200 pt-3 font-bold text-slate-900">
              <span>Total</span>
              <span>{formatINR(o.total)}</span>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold">📍 Delivery to:</p>
              <p className="mt-1">
                {o.zone?.name} · {o.scheduledSlot}
              </p>
            </div>
          </div>

          {/* SPLIT BILL */}
          <SplitBillCard orderId={id} total={o.total} />
        </div>
      </div>
    </div>
  );
}

function SplitBillCard({ orderId, total }: { orderId: string; total: number }) {
  const createGroup = trpc.group.create.useMutation();
  const myGroups = trpc.group.mine.useQuery();

  const group = myGroups.data?.find((g) => g.orderId === orderId);

  const handleCreate = () => {
    createGroup.mutate({ orderId });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <FiUsers className="h-4 w-4 text-indigo-600" /> Split the bill
        </h2>
        {group ? (
          <Link
            href={`/split/${group.shareCode}`}
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            View split →
          </Link>
        ) : (
          <button
            onClick={handleCreate}
            disabled={createGroup.isPending}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
          >
            Create split link
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Share the link with roommates — everyone splits{" "}
        <b>{formatINR(total)}</b> and pays their own share.
      </p>
      {group && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2">
          <code className="flex-1 truncate text-xs font-semibold text-indigo-700">
            {`${window.location.origin}/split/${group.shareCode}`}
          </code>
          <button
            onClick={() =>
              navigator.clipboard.writeText(
                `${window.location.origin}/split/${group.shareCode}`,
              )
            }
            className="text-indigo-600"
            aria-label="Copy link"
          >
            <FiCopy className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
