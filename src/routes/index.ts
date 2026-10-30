import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";

import restaurantRoutes from "../modules/restaurants/restaurant.routes.js"
import categoryRoutes from "../modules/category/category.routes.js";
import menuRoutes from "../modules/menu/menu.routes.js";
import cartRouter from "../modules/cart/cart.routes.js";
import orderRouter from "../modules/orders/order.routes.js"
import paymentRouter from "../modules/payments/payment.routes.js";
import deliveryRoutes from "../modules/deliveries/deliveries.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/restaurant", restaurantRoutes)
router.use("/category", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/cart", cartRouter)
router.use("/order", orderRouter)
router.use("/payment", paymentRouter);
router.use("/delivery", deliveryRoutes);

export default router;