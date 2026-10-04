import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { addCartItemSchema, updateCartItemSchema, cartItemParamsSchema } from "./cart.schema.js";
import { addCartItemController, clearCartController, getCartController, removeCartItemController, updateCartItemController } from "./cart.controller.js";


const cartRouter = Router();

// Apply authentication to all cart routes
cartRouter.use(authenticate, authorize('CUSTOMER'));

// GET /api/v1/cart
cartRouter.get('/', getCartController);
// DELETE /api/v1/cart
cartRouter.delete('/', clearCartController);

// POST /api/v1/cart/items
cartRouter.post(
  '/items',
  validate(addCartItemSchema),
  addCartItemController
);

// PATCH /api/v1/cart/items/:itemId
cartRouter.patch(
  '/items/:itemId',
  validate(cartItemParamsSchema),
  validate(updateCartItemSchema),
  updateCartItemController
);

// DELETE /api/v1/cart/items/:itemId
cartRouter.delete(
  '/items/:itemId',
  validate(cartItemParamsSchema),
  removeCartItemController
);

export default cartRouter;