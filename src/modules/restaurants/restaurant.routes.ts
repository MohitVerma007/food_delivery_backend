import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createRestaurantSchema } from "./restaurant.schema.js";
import { createRestaurantController, getAllRestaurantController, restaurantOrderAction } from "./restaurant.controller.js";


const router = Router();

router.post( "/create", 
    authenticate, 
    authorize("ADMIN", "CUSTOMER","RESTAURANT_OWNER"),
    validate(createRestaurantSchema),
    createRestaurantController    
)

router.get("/get", getAllRestaurantController)


router.post(
  "/:restaurantId/orders/:orderId/accept",
  authenticate,
  authorize("RESTAURANT_OWNER"),
  restaurantOrderAction("ACCEPT")
);

router.post(
  "/:restaurantId/orders/:orderId/reject",
  authenticate,
  authorize("RESTAURANT_OWNER"),
  restaurantOrderAction("REJECT")
);

router.post(
  "/:restaurantId/orders/:orderId/preparing",
  authenticate,
  authorize("RESTAURANT_OWNER"),
  restaurantOrderAction("PREPARING")
);

router.post(
  "/:restaurantId/orders/:orderId/ready",
  authenticate,
  authorize("RESTAURANT_OWNER"),
  restaurantOrderAction("READY")
);


export default router;