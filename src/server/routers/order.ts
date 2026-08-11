import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrderStatus, PaymentStatus, TrackingType } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";

const createOrderSchema = z.object({
  addressLine: z.string().min(5, "Enter a full address"),
  hostel: z.string().optional(),
  roomNo: z.string().optional(),
  zoneId: z.string().optional(),
  scheduledSlot: z.string().optional(),
  deliveryFee: z.number().int().min(0).default(0),
});

export const orderRouter = router({
  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const cart = await ctx.prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: { items: { include: { product: true } } },
      });

      if (!cart || cart.items.length === 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Your cart is empty" });

      // Recompute server-side to avoid tampering
      const itemsTotal = cart.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0,
      );
      const deliveryFee = input.deliveryFee;
      const total = itemsTotal + deliveryFee;

      // Check stock, build order items snapshot
      const orderItems = cart.items.map((item) => {
        if (item.product.stock < item.quantity)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Not enough stock for ${item.product.name}`,
          });
        return {
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.imageUrl,
        };
      });

      const zone = input.zoneId
        ? await ctx.prisma.deliveryZone.findUnique({ where: { id: input.zoneId } })
        : null;

      const order = await ctx.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId: ctx.user.id,
            total,
            itemsTotal,
            deliveryFee,
            addressLine: input.addressLine,
            hostel: input.hostel,
            roomNo: input.roomNo,
            zoneId: zone?.id,
            scheduledSlot: input.scheduledSlot,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.CREATED,
            items: { create: orderItems },
            tracking: {
              create: {
                type: TrackingType.PLACED,
                note: "Order placed. Awaiting payment.",
              },
            },
          },
          include: { items: true },
        });

        // Decrement stock
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        return created;
      });

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      };
    }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const orders = await ctx.prisma.order.findMany({
      where: { userId: ctx.user.id },
      include: {
        items: true,
        zone: true,
        tracking: { orderBy: { createdAt: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders;
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: {
          items: true,
          zone: true,
          tracking: { orderBy: { createdAt: "asc" } },
          user: { select: { name: true, email: true } },
          group: { include: { members: { include: { user: true } } } },
        },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.userId !== ctx.user.id && !ctx.user.role)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
      return order;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.userId !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order can no longer be cancelled",
        });

      await ctx.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
        });
        // Restore stock
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.trackingEvent.create({
          data: { orderId: order.id, type: "PLACED", note: "Order cancelled." },
        });
      });

      return { ok: true };
    }),
});
