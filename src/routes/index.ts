import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";

import restaurantRoutes from "../modules/restaurants/restaurant.routes.js"

const router = Router();

router.use("/auth", authRoutes);
router.use("/restaurant", restaurantRoutes)

export default router;