import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PaymentStatus } from "@prisma/client";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { createRazorpayOrder, verifySignature, isSandboxConfigured } from "../razorpay";
import { trackOrderPublic } from "../tracking";

export const paymentRouter = router({
  createOrder: protectedProcedure
    .input(
      z.object({
        itemsTotal: z.number().int().positive(),
        deliveryFee: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input }) => {
      const total = input.itemsTotal + input.deliveryFee;
      if (total <= 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid amount" });

      if (!isSandboxConfigured) {
        // Sandbox keys not set — return a fake order so checkout can be demoed
        return {
          id: `demo_${Date.now().toString(36)}`,
          amount: total,
          currency: "INR",
          keyId: "",
        };
      }

      const rzp = await createRazorpayOrder(
        total,
        `order-${Date.now().toString(36)}`,
      );

      return {
        id: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      };
    }),

  verify: protectedProcedure
    .input(
      z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        orderId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });

      // In demo mode (no sandbox keys), skip the signature check
      if (isSandboxConfigured) {
        const valid = verifySignature({
          orderId: input.razorpayOrderId,
          paymentId: input.razorpayPaymentId,
          signature: input.razorpaySignature,
        });

        if (!valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment verification failed" });
        }
      }

      await ctx.prisma.$transaction([
        ctx.prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paymentStatus: PaymentStatus.PAID,
            razorpayPaymentId: input.razorpayPaymentId,
            razorpaySignature: input.razorpaySignature,
          },
        }),
        ctx.prisma.trackingEvent.create({
          data: {
            orderId: order.id,
            type: "PAID",
            note: `Payment of ₹${(order.total / 100).toFixed(2)} received.`,
          },
        }),
      ]);

      return { ok: true };
    }),

  track: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      return trackOrderPublic(input.orderId);
    }),

  simulate: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });
      if (!order || order.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
      return trackOrderPublic(input.orderId);
    }),

  // Demo-only: dispatch a paid order so the live map starts moving.
  dispatch: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      });
      if (!order || order.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
      if (order.paymentStatus !== "PAID")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order must be paid before dispatching",
        });

      await ctx.prisma.$transaction([
        ctx.prisma.order.update({
          where: { id: order.id },
          data: { status: "OUT_FOR_DELIVERY" },
        }),
        ctx.prisma.trackingEvent.create({
          data: {
            orderId: order.id,
            type: "OUT_FOR_DELIVERY",
            note: "Courier assigned — your order is on the way!",
          },
        }),
      ]);
      return trackOrderPublic(input.orderId);
    }),
});
