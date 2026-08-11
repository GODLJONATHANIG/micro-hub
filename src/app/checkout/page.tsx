"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/app/providers";
import { formatINR } from "@/components/ProductCard";
import { FiCheckCircle } from "react-icons/fi";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { data: me } = trpc.auth.me.useQuery();
  const cart = trpc.cart.get.useQuery(undefined, { enabled: !!me });
  const zones = trpc.product.zones.useQuery();

  const createOrder = trpc.order.create.useMutation();
  const rzpOrder = trpc.payment.createOrder.useMutation();
  const verify = trpc.payment.verify.useMutation();

  const [address, setAddress] = useState("");
  const [hostel, setHostel] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [slot, setSlot] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const items = cart.data?.items ?? [];
  const itemsTotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const deliveryFee = itemsTotal > 0 ? 15 : 0;
  const total = itemsTotal + deliveryFee;

  const slots = [
    "Immediately (ASAP)",
    "Before 1st lecture · 8–9 AM",
    "Lunch break · 12–1 PM",
    "After classes · 4–5 PM",
    "Evening study slot · 7–8 PM",
  ];

  async function handlePay() {
    setError(null);
    if (!address.trim() || !zoneId) {
      setError("Enter your address and pick a delivery zone.");
      return;
    }

    setPaying(true);
    try {
      const order = await createOrder.mutateAsync({
        addressLine: address,
        hostel,
        roomNo,
        zoneId,
        scheduledSlot: slot || "Immediately (ASAP)",
        deliveryFee,
      });

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Could not load the payment gateway. Try again.");
        setPaying(false);
        return;
      }

      const rzp = await rzpOrder.mutateAsync({
        itemsTotal,
        deliveryFee,
      });

      if (!window.Razorpay || !rzp.keyId) {
        // Sandbox not configured — fall back to demo order (no real charge)
        await verify.mutateAsync({
          orderId: order.id,
          razorpayOrderId: rzp.id,
          razorpayPaymentId: "sandbox_demo",
          razorpaySignature: "demo_signature",
        });
        setDone(order.id);
        return;
      }

      const rz = new window.Razorpay({
        key: rzp.keyId,
        amount: Number(rzp.amount),
        currency: rzp.currency,
        name: "Micro Hub",
        description: `Order #${order.orderNumber} · Campus delivery`,
        order_id: rzp.id,
        prefill: {
          name: me?.name,
          email: me?.email,
        },
        handler: async (response) => {
          try {
            await verify.mutateAsync({
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setDone(order.id);
          } catch {
            setError("Payment succeeded but we couldn't confirm it. Check your orders.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
        theme: { color: "#4f46e5" },
      });

      rz.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please retry.");
      setPaying(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <FiCheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Order confirmed! 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your payment is verified. Your order is being prepared and a courier
          will be assigned shortly.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/orders/${done}`}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
          >
            Track my order live
          </Link>
          <Link
            href="/orders"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
          >
            My orders
          </Link>
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">🔐</p>
        <h1 className="mt-3 text-2xl font-bold">Sign in to check out</h1>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !cart.isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-3 text-2xl font-bold">Your cart is empty</h1>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white"
        >
          Go to store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Delivery details</h2>
            <p className="text-xs text-slate-500">
              Where should the campus courier drop your order?
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                placeholder="Hostel / Block (e.g. Hostel A)"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
              <input
                value={roomNo}
                onChange={(e) => setRoomNo(e.target.value)}
                placeholder="Room no. (e.g. 214)"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address / landmark (e.g. Room 214, Hostel A, near mess)"
              rows={2}
              className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Delivery zone</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {zones.data?.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setZoneId(z.id)}
                  className={`rounded-xl border p-3 text-left text-sm transition ${
                    zoneId === z.id
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <p className="font-semibold text-slate-900">📍 {z.name}</p>
                  <p className="text-xs text-slate-500">{z.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Schedule delivery</h2>
            <p className="text-xs text-slate-500">
              Unique to Micro Hub — pick a slot that fits your timetable.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    slot === s
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:border-indigo-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Order summary</h2>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={i.product.imageUrl}
                  alt={i.product.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                  {i.product.name} × {i.quantity}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatINR(i.product.price * i.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-dashed border-slate-200 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Items</span>
              <span>{formatINR(itemsTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery fee</span>
              <span>{formatINR(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          <button
            onClick={handlePay}
            disabled={paying || cart.isLoading}
            className="mt-4 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {paying ? "Processing payment…" : `Pay ${formatINR(total)} securely`}
          </button>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            🔒 Powered by Razorpay · UPI · Cards · Netbanking
          </p>
        </div>
      </div>
    </div>
  );
}
