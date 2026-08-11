import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const productRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          search: z.string().optional(),
          featured: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const category = input?.category;
      const search = input?.search?.trim();
      const featured = input?.featured;

      return ctx.prisma.product.findMany({
        where: {
          ...(category ? { category: { slug: category } } : {}),
          ...(featured ? { featured: true } : {}),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { description: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { category: true, vendor: true },
        orderBy: { featured: "desc" },
      });
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { slug: input.slug },
        include: { category: true, vendor: true },
      });
      if (!product) return null;
      return product;
    }),

  related: publicProcedure
    .input(z.object({ productId: z.string(), limit: z.number().default(4) }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.prisma.product.findUnique({
        where: { id: input.productId },
      });
      if (!product) return [];
      return ctx.prisma.product.findMany({
        where: { categoryId: product.categoryId, id: { not: product.id } },
        include: { category: true },
        take: input.limit,
      });
    }),

  categories: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      include: { _count: { select: { products: true } } },
    });
  }),

  zones: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.deliveryZone.findMany();
  }),
});
