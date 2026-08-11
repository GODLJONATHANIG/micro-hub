"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/app/providers";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    roomNo: "",
    hostel: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [verifiedHint, setVerifiedHint] = useState(false);

  const signup = trpc.auth.signup.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "email") {
      setVerifiedHint(
        /\.(edu|ac)\.[a-z]{2,}$|@student\.|\.edu$|\.ac\.in$/.test(v.toLowerCase()),
      );
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-2xl font-bold text-white">
            M
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Join Micro Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Student-first campus delivery, at your fingertips.
          </p>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            signup.mutate(form);
          }}
        >
          <div>
            <label className="text-xs font-semibold text-slate-600">Full name</label>
            <input
              value={form.name}
              onChange={set("name")}
              required
              placeholder="e.g. Aarav Sharma"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">
              College email <span className="text-indigo-500">(required for student badge)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              required
              placeholder="you@college.edu"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
            {verifiedHint && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600">
                ✓ Looks like a college email — you&apos;ll get the Verified Student badge.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Hostel / Block</label>
              <input
                value={form.hostel}
                onChange={set("hostel")}
                placeholder="Hostel A"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Room no.</label>
              <input
                value={form.roomNo}
                onChange={set("roomNo")}
                placeholder="214"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={set("phone")}
              placeholder="9876543210"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={signup.isPending}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {signup.isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
