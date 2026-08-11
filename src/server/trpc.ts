import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { prisma } from "./db";
import { getSessionUser } from "./auth";

export async function createContext() {
  const user = await getSessionUser();
  return { prisma, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
