import { Router } from "express";
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createMenuItemSchema } from './menu.schema.js';
import { createMenuController, getMenuItemByIdController, getRestaurantMenuController, updateMenuController, deleteMenuController } from './menu.controller.js';

const menuItemRouter = Router();


menuItemRouter.post('/', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), validate(createMenuItemSchema), createMenuController);
menuItemRouter.get('/:menuItemId', authenticate, getMenuItemByIdController);
menuItemRouter.get('/restaurant/:restaurantId', authenticate, getRestaurantMenuController);
menuItemRouter.put('/:menuItemId', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), validate(createMenuItemSchema), updateMenuController);
menuItemRouter.delete('/:menuItemId', authenticate, authorize("ADMIN", "RESTAURANT_OWNER"), deleteMenuController);

export default menuItemRouter;