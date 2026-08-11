"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiTrash2, FiArrowLeft } from "react-icons/fi";

export default function CartPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery();
  const cart = trpc.cart.get.useQuery(undefined, { enabled: !!me });
  const updateQty = trpc.cart.updateQty.useMutation({
    onSuccess: () => cart.refetch(),
  });
  const remove = trpc.cart.remove.useMutation({
    onSuccess: () => cart.refetch(),
  });

  const items = cart.data?.items ?? [];
  const itemsTotal = items.reduce(
    (s, i) => s + i.product.price * i.quantity,
    0,
  );
  const deliveryFee = itemsTotal > 0 ? 15 : 0;
  const total = itemsTotal + deliveryFee;

  if (meLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">🔐</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          Sign in to view your cart
        </h1>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/signin"
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
          >
            Browse store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <FiArrowLeft /> Continue shopping
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">
        Your Cart ({items.length})
      </h1>

      {items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-5xl">🛒</p>
          <p className="mt-3 font-semibold text-slate-700">Your cart is empty</p>
          <p className="text-sm text-slate-500">
            Add notebooks, snacks or hostel essentials from the store.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Go to the store
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">
                    {item.product.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatINR(item.product.price)} each
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-slate-300">
                      <button
                        onClick={() =>
                          updateQty.mutate({
                            itemId: item.id,
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        className="px-3 py-1 text-slate-600 hover:text-indigo-600"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQty.mutate({
                            itemId: item.id,
                            quantity: item.quantity + 1,
                          })
                        }
                        className="px-3 py-1 text-slate-600 hover:text-indigo-600"
                      >
                        +
                      </button>
                    </div>
                    <p className="font-bold text-slate-900">
                      {formatINR(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => remove.mutate({ itemId: item.id })}
                  className="self-start text-slate-300 transition hover:text-red-500"
                  aria-label="Remove"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Bill Details</h2>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Items total</span>
                <span>{formatINR(itemsTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery fee</span>
                <span>{formatINR(deliveryFee)}</span>
              </div>
              <div className="border-t border-dashed border-slate-200 pt-2">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>To pay</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push("/checkout")}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Proceed to Checkout →
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              UPI, cards, netbanking · Razorpay secure payments
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
