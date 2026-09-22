import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createRestaurant, getRestaurants } from "./restaurant.service.js";

export const createRestaurantController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const restaurant = await createRestaurant(req.user!.id, req.body);

    return res.status(201).json({
      restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRestaurantController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Fallback to default numeric values if req.query parameters are missing or NaN
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

    const restaurant = await getRestaurants(limit, offset);

    return res.status(200).json({
      restaurant,
    });
  } catch (error) {
    next(error);
  }
};
