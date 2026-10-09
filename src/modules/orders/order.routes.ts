import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createOrderSchema } from "./order.schema.js";
import { createOrderController } from "./order.controller.js";


const orderRouter = Router();

orderRouter.post("/orders",
    authenticate,
    authorize("CUSTOMER"),
    validate(createOrderSchema),
    createOrderController
)

export default orderRouter;