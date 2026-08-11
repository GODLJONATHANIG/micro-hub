import Link from "next/link";
import type { Product } from "@prisma/client";

type ProductWithRelations = Product & {
  category?: { name: string; emoji: string } | null;
  vendor?: { name: string; emoji: string } | null;
};

export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default function ProductCard({ product }: { product: ProductWithRelations }) {
  const discount = product.mrp
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            {discount}% OFF
          </span>
        )}
        {product.vendor && (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow">
            {product.vendor.emoji} {product.vendor.name}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
          {product.category?.emoji} {product.category?.name}
        </p>
        <h3 className="mt-1 line-clamp-1 font-semibold text-slate-900">
          {product.name}
        </h3>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {formatINR(product.price)}
            </p>
            {product.mrp ? (
              <p className="text-xs text-slate-400 line-through">
                {formatINR(product.mrp)}
              </p>
            ) : null}
          </div>
          <span className="flex h-8 items-center rounded-lg bg-indigo-50 px-2 text-xs font-semibold text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
            Add →
          </span>
        </div>
      </div>
    </Link>
  );
}
