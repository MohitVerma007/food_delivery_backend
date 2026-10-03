import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { addCartItem } from './cart.service.js';


// 1. POST /api/v1/cart/items
export const addCartItemController = async(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;
        const item = await addCartItem(userId, req.body);

        return res.status(201).json({
            message: "Item added to cart successfully",
            item,
        });
    } catch (error) {
        next(error);
    }
};