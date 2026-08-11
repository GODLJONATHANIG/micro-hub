"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";
import ProductCard from "@/components/ProductCard";
import { formatINR } from "@/components/ProductCard";
import { FiShoppingCart, FiCheck, FiTruck } from "react-icons/fi";

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const { data: product, isLoading } = trpc.product.bySlug.useQuery({ slug });
  const { data: related } = trpc.product.related.useQuery(
    { productId: product?.id ?? "", limit: 4 },
    { enabled: !!product?.id },
  );
  const { data: me } = trpc.auth.me.useQuery();
  const add = trpc.cart.add.useMutation({
    onSuccess: () => {
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="h-[28rem] animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-4xl">🫠</p>
        <p className="mt-2 text-lg font-semibold text-slate-700">
          Product not found
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to store
        </Link>
      </div>
    );
  }

  const discount = product.mrp
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const handleAdd = () => {
    if (!me) {
      router.push("/signin");
      return;
    }
    add.mutate({ productId: product.id, quantity: qty });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="text-xs text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Store
        </Link>
        <span className="mx-1">/</span>
        <span>{product.category?.emoji} {product.category?.name}</span>
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="aspect-square w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          {product.vendor && (
            <p className="text-sm font-semibold text-indigo-600">
              {product.vendor.emoji} {product.vendor.name}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {product.category?.emoji} {product.category?.name}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-sm font-bold text-amber-700">
              ★ {product.rating}
            </span>
            {discount > 0 && (
              <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-sm font-bold text-rose-600">
                {discount}% OFF
              </span>
            )}
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900">
              {formatINR(product.price)}
            </span>
            {product.mrp && (
              <span className="text-lg text-slate-400 line-through">
                {formatINR(product.mrp)}
              </span>
            )}
          </div>

          <p className="mt-4 text-slate-600">{product.description}</p>

          <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
            <FiTruck className="h-4 w-4 text-indigo-600" />
            Delivery in ~10–15 min to any campus zone
          </div>
          <div
            className={`mt-2 text-sm font-semibold ${
              product.stock > 10 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {product.stock > 10 ? "In stock" : `Only ${product.stock} left!`}
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex items-center rounded-xl border border-slate-300 bg-white">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-4 py-3 text-lg font-bold text-slate-600 hover:text-indigo-600"
              >
                −
              </button>
              <span className="w-8 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="px-4 py-3 text-lg font-bold text-slate-600 hover:text-indigo-600"
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={add.isPending || product.stock === 0}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-sm transition ${
                added
                  ? "bg-emerald-600"
                  : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300"
              }`}
            >
              {added ? (
                <>
                  <FiCheck className="h-5 w-5" /> Added to cart!
                </>
              ) : (
                <>
                  <FiShoppingCart className="h-5 w-5" /> Add to cart
                </>
              )}
            </button>
          </div>

          {!me && (
            <p className="mt-3 text-xs text-slate-400">
              You&apos;ll be asked to sign in before adding to cart.
            </p>
          )}
        </div>
      </div>

      {related && related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">You might also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
