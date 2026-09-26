import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory } from './category.service.js';

export const createCategoryController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const category = await createCategory(restaurantId, req.body);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const getCategoryByIdController = async (
  req: Request,
  res: Response,
    next: NextFunction
) => {
  try {
    const { categoryId } = req.params as { categoryId: string };
    const category = await getCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    next(error);
  }
};


export const getCategoriesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 20);
    const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0); 
    const categories = await getCategories(restaurantId, limit, offset);
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const updateCategoryController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { categoryId } = req.params as { categoryId: string };
        const updatedCategory = await updateCategory(categoryId, req.body);
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json(updatedCategory);
    } catch (error) {
        next(error);
    }
}