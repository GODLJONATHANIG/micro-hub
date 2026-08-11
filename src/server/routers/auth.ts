import { z } from "zod";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { createSession, destroySession } from "../auth";
import { Role } from "@prisma/client";

const emailSchema = z.string().email("Enter a valid email");

function isStudentEmail(email: string) {
  return /\.(edu|ac)\.[a-z]{2,}$|@student\.|\.edu$|\.ac\.in$/.test(
    email.toLowerCase(),
  );
}

export const authRouter = router({
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: emailSchema,
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().optional(),
        roomNo: z.string().optional(),
        hostel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email.toLowerCase(),
          passwordHash,
          phone: input.phone,
          roomNo: input.roomNo,
          hostel: input.hostel,
          emailVerified: isStudentEmail(input.email),
          role: Role.STUDENT,
        },
      });

      await ctx.prisma.cart.create({ data: { userId: user.id } });
      await createSession(user.id);
      return { id: user.id, name: user.name, email: user.email };
    }),

  login: publicProcedure
    .input(z.object({ email: emailSchema, password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }
      await createSession(user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  logout: protectedProcedure.mutation(async () => {
    await destroySession();
    return { ok: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roomNo: true,
        hostel: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }),
});
