import { router } from "../trpc";
import { authRouter } from "./auth";
import { productRouter } from "./product";
import { cartRouter } from "./cart";
import { orderRouter } from "./order";
import { paymentRouter } from "./payment";
import { groupRouter } from "./group";

export const appRouter = router({
  auth: authRouter,
  product: productRouter,
  cart: cartRouter,
  order: orderRouter,
  payment: paymentRouter,
  group: groupRouter,
});

export type AppRouter = typeof appRouter;
