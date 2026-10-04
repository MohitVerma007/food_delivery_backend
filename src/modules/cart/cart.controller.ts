import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItemQuantity } from './cart.service.js';


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





// 2. GET /api/v1/cart
export const getCartController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const cart = await getCart(userId);

    return res.status(200).json(cart);
  } catch (error) {
    next(error);
  }
};

// 3. PATCH /api/v1/cart/items/:itemId
export const updateCartItemController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const itemId = req.params.itemId as string;

    const item = await updateCartItemQuantity(userId, itemId, req.body);

    return res.status(200).json({
      message: "Cart item updated successfully",
      item,
    });
  } catch (error) {
    next(error);
  }
};

// 4. DELETE /api/v1/cart/items/:itemId
export const removeCartItemController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const itemId = req.params.itemId as string;

    const result = await removeCartItem(userId, itemId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// 5. DELETE /api/v1/cart
export const clearCartController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id;
    const result = await clearCart(userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};


