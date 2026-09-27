import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createCategorySchema } from './category.schema.js';
import { createCategoryController, deleteCategoryController, getAllCategoriesController, getCategoryByIdController, updateCategoryController } from './category.controller.js';

const categoryRouter = Router();

categoryRouter.post('/create/:restaurantId', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), validate(createCategorySchema), createCategoryController);
categoryRouter.get('/getall/:restaurantId', authenticate, getAllCategoriesController);
categoryRouter.get('/getbyid/:categoryId', authenticate, getCategoryByIdController);
categoryRouter.put('/update/:categoryId', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), validate(createCategorySchema), updateCategoryController);
categoryRouter.delete('/delete/:categoryId', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), deleteCategoryController);
export default categoryRouter;