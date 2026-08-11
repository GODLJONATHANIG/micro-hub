import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";

export const cartRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const cart = await ctx.prisma.cart.findUnique({
      where: { userId: ctx.user.id },
      include: {
        items: {
          include: { product: { include: { category: true } } },
        },
      },
    });
    if (!cart) {
      return ctx.prisma.cart.create({
        data: { userId: ctx.user.id },
        include: { items: { include: { product: true } } },
      });
    }
    return cart;
  }),

  add: protectedProcedure
    .input(z.object({ productId: z.string(), quantity: z.number().min(1).max(99).default(1) }))
    .mutation(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      if (product.stock < input.quantity)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough stock" });

      let cart = await ctx.prisma.cart.findUnique({ where: { userId: ctx.user.id } });
      if (!cart) {
        cart = await ctx.prisma.cart.create({ data: { userId: ctx.user.id } });
      }

      const existing = await ctx.prisma.cartItem.findUnique({
        where: {
          cartId_productId: { cartId: cart.id, productId: input.productId },
        },
      });

      if (existing) {
        const newQty = existing.quantity + input.quantity;
        if (newQty > product.stock)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough stock" });
        await ctx.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: newQty },
        });
      } else {
        await ctx.prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: input.productId,
            quantity: input.quantity,
          },
        });
      }

      return ctx.prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: { include: { product: true } } },
      });
    }),

  updateQty: protectedProcedure
    .input(z.object({ itemId: z.string(), quantity: z.number().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.cartItem.findUnique({
        where: { id: input.itemId },
        include: { product: true },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      if (input.quantity > item.product.stock)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Not enough stock" });

      await ctx.prisma.cartItem.update({
        where: { id: input.itemId },
        data: { quantity: input.quantity },
      });

      return ctx.prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: { items: { include: { product: true } } },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.cartItem.delete({ where: { id: input.itemId } });
      return ctx.prisma.cart.findUnique({
        where: { userId: ctx.user.id },
        include: { items: { include: { product: true } } },
      });
    }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const cart = await ctx.prisma.cart.findUnique({ where: { userId: ctx.user.id } });
    if (cart) await ctx.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { ok: true };
  }),
});
