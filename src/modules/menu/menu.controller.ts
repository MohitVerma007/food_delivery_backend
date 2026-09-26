import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { createMenu, deleteMenu, updateMenu, getMenuItemById, getMenuItemsByRestaurantId} from './menu.service.js';

export const createMenuController = async (
  req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { restaurantId } = req.params as { restaurantId: string };
        const menuItem = await createMenu(restaurantId, req.body);
        res.status(201).json(menuItem);
    } catch (error) {
        next(error);
    }
};

export const getMenuItemByIdController = async (    
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { menuItemId } = req.params as { menuItemId: string };
        const menuItem = await getMenuItemById(menuItemId);
        if (!menuItem) {
            const error = new Error("Menu item not found");
            (error as Error & { statusCode?: number }).statusCode = 404;
            throw error;
        }
        res.status(200).json(menuItem);
    } catch (error) {
        next(error);
    }
};

export const getMenuItemsByRestaurantIdController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { restaurantId } = req.params as { restaurantId: string };
        const menuItems = await getMenuItemsByRestaurantId(restaurantId);
        res.status(200).json(menuItems);
    } catch (error) {
        next(error);
    }

};

export const updateMenuController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { menuItemId } = req.params as { menuItemId: string };
        const updatedMenuItem = await updateMenu(menuItemId, req.body);
        res.status(200).json(updatedMenuItem);
    } catch (error) {
        next(error);
    }
};

export const deleteMenuController = async ( 
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const { menuItemId } = req.params as { menuItemId: string };
        await deleteMenu(menuItemId);
        res.status(200).json({ message: "Menu item deleted successfully" });
    } catch (error) {
        next(error);
    }
};  