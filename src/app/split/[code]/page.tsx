"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiCopy, FiCheckCircle } from "react-icons/fi";

export default function SplitDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { data: me } = trpc.auth.me.useQuery();
  const group = trpc.group.byCode.useQuery({ code });
  const join = trpc.group.join.useMutation({
    onSuccess: () => group.refetch(),
  });
  const markPaid = trpc.group.markPaid.useMutation({
    onSuccess: () => group.refetch(),
  });
  const [copied, setCopied] = useState(false);

  if (group.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  const g = group.data;

  if (!g) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">🔗</p>
        <h1 className="mt-3 text-2xl font-bold">Split link not found</h1>
        <Link
          href="/split"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          My splits
        </Link>
      </div>
    );
  }

  const myShare = me
    ? g.members.find((m) => m.userId === me.id)
    : undefined;
  const allPaid = g.members.length > 0 && g.members.every((m) => m.paid);

  const url = `${window.location.origin}/split/${g.shareCode}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">
          Split · Order #{g.order.orderNumber}
        </h1>
        <Link
          href={`/orders/${g.order.id}`}
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          View order →
        </Link>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Created by <b>{g.createdBy.name}</b> · {g.order.items.length} item(s) ·{" "}
        <b>{formatINR(g.order.total)}</b> total
      </p>

      {/* items preview */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Order items
        </h2>
        <div className="mt-2 space-y-2">
          {g.order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="flex-1 text-slate-700">
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold">
                {formatINR(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* share link */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Share this split
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {url}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            {copied ? <FiCheckCircle /> : <FiCopy />} {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* members */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Who&apos;s in ({g.members.length})
        </h2>
        <div className="mt-3 space-y-2">
          {g.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {m.user.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {m.user.name}
                    {m.userId === me?.id && <span className="text-indigo-500"> (you)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.user.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {formatINR(m.amount)}
                </p>
                {m.paid ? (
                  <p className="text-xs font-semibold text-emerald-600">
                    ✓ Paid
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-amber-600">
                    Pending
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {allPaid && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <FiCheckCircle /> Everyone has paid — order is confirmed for delivery!
          </div>
        )}
      </div>

      {/* actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        {!myShare ? (
          me ? (
            <button
              onClick={() => join.mutate({ code })}
              disabled={join.isPending}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
            >
              {join.isPending ? "Joining…" : "Join this split"}
            </button>
          ) : (
            <Link
              href="/signin"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
            >
              Sign in to join
            </Link>
          )
        ) : myShare.paid ? (
          <span className="rounded-xl bg-emerald-100 px-5 py-2.5 text-sm font-bold text-emerald-700">
            ✓ You&apos;ve paid your share
          </span>
        ) : (
          <button
            onClick={() => markPaid.mutate({ groupId: g.id })}
            disabled={markPaid.isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            {markPaid.isPending ? "Confirming…" : `I've paid ${formatINR(myShare.amount)}`}
          </button>
        )}
      </div>
    </div>
  );
}
