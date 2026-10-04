import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";

import restaurantRoutes from "../modules/restaurants/restaurant.routes.js"
import categoryRoutes from "../modules/category/category.routes.js";
import menuRoutes from "../modules/menu/menu.routes.js";
import cartRouter from "../modules/cart/cart.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/restaurant", restaurantRoutes)
router.use("/category", categoryRoutes);
router.use("/menu", menuRoutes);
router.use("/cart", cartRouter)

export default router;