import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrderStatus, PaymentStatus, TrackingType } from "@prisma/client";
import { router, protectedProcedure, publicProcedure } from "../trpc";

export const groupRouter = router({
  // Create a shareable group for an order (split the bill with roommates)
  create: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        splitMethod: z.enum(["EQUAL"]).default("EQUAL"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: { group: true },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });

      if (order.group) return order.group;

      const group = await ctx.prisma.groupOrder.create({
        data: {
          orderId: order.id,
          createdById: ctx.user.id,
          splitMethod: input.splitMethod,
          members: {
            create: {
              userId: ctx.user.id,
              amount: order.total,
              paid: false,
            },
          },
        },
        include: { members: { include: { user: true } } },
      });
      return group;
    }),

  // Anyone with the code can see the order and join the split
  byCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.prisma.groupOrder.findUnique({
        where: { shareCode: input.code },
        include: {
          order: { include: { items: true, zone: true, user: { select: { name: true } } } },
          members: { include: { user: true } },
          createdBy: { select: { name: true } },
        },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Split not found" });
      return group;
    }),

  // Join a split and mark your contribution
  join: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.groupOrder.findUnique({
        where: { shareCode: input.code },
        include: { members: true, order: true },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Split not found" });

      const existing = group.members.find((m) => m.userId === ctx.user.id);
      if (existing) return group;

      const splitAmount = Math.ceil(group.order.total / (group.members.length + 1));
      // Redistribute equally among current members
      const currentCount = group.members.length;

      const updated = await ctx.prisma.$transaction(async (tx) => {
        const newMember = await tx.groupOrderMember.create({
          data: {
            groupOrderId: group.id,
            userId: ctx.user.id,
            amount: splitAmount,
          },
        });
        // Re-split: everyone pays total / (count+1)
        const newCount = currentCount + 1;
        const perPerson = Math.ceil(group.order.total / newCount);
        for (const m of [...group.members, newMember]) {
          await tx.groupOrderMember.update({
            where: { id: m.id },
            data: { amount: perPerson },
          });
        }
        return tx.groupOrder.findUnique({
          where: { id: group.id },
          include: { members: { include: { user: true } } },
        });
      });

      return updated;
    }),

  markPaid: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.prisma.groupOrderMember.findFirst({
        where: { groupOrderId: input.groupId, userId: ctx.user.id },
      });
      if (!member)
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not in this split" });

      const updated = await ctx.prisma.groupOrderMember.update({
        where: { id: member.id },
        data: { paid: true },
      });

      // If everyone has paid, mark the order confirmed for delivery
      const group = await ctx.prisma.groupOrder.findUnique({
        where: { id: input.groupId },
        include: { members: true, order: true },
      });
      const allPaid = group?.members.every((m) => m.paid);
      if (allPaid && group && group.order.paymentStatus !== PaymentStatus.PAID) {
        await ctx.prisma.$transaction([
          ctx.prisma.order.update({
            where: { id: group.orderId },
            data: {
              paymentStatus: PaymentStatus.PAID,
              status: OrderStatus.CONFIRMED,
            },
          }),
          ctx.prisma.trackingEvent.create({
            data: {
              orderId: group.orderId,
              type: TrackingType.PAID,
              note: "All friends have paid their share. Order confirmed!",
            },
          }),
        ]);
      }

      return updated;
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.groupOrder.findMany({
      where: {
        OR: [
          { createdById: ctx.user.id },
          { members: { some: { userId: ctx.user.id } } },
        ],
      },
      include: {
        order: { include: { items: true } },
        members: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),
});
