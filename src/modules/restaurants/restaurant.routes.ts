import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createRestaurantSchema } from "./restaurant.schema.js";
import { createRestaurantController, getAllRestaurantController } from "./restaurant.controller.js";


const router = Router();

router.post( "/create", 
    authenticate, 
    authorize("ADMIN", "CUSTOMER","RESTAURANT_OWNER"),
    validate(createRestaurantSchema),
    createRestaurantController    
)

router.get("/get", getAllRestaurantController)

export default router;