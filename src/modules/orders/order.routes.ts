import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createOrderSchema } from "./order.schema.js";
import { createOrderController, getOrdersController, getOrdersbyIdController } from "./order.controller.js";


const orderRouter = Router();

orderRouter.post("/create_orders",
    authenticate,
    authorize("CUSTOMER"),
    validate(createOrderSchema),
    createOrderController
)

orderRouter.get("/get_orders_by_id",
    authenticate,
    authorize("CUSTOMER"),
    getOrdersbyIdController
)


orderRouter.get("/get_orders",
    authenticate,
    authorize("CUSTOMER"),
    getOrdersController
)


export default orderRouter;