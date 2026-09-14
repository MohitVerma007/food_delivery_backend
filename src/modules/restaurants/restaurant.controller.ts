import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createRestaurant } from "./restaurant.service.js";

export const createRestaurantController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    
    try {
        const restaurant = await createRestaurant(
            req.user!.id,
            req.body
        );

        return res.status(201).json({
            restaurant
        })
    } catch (error) {
        next(error)
    }


}