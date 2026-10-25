import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { initiatePaymentController, paymentWebhookController } from "./payment.controller.js";
import { createPaymentSchema } from "./payment.schema.js";

const paymentRouter = Router();

paymentRouter.post("/create_payment",
    authenticate,
    authorize("CUSTOMER"),
    validate(createPaymentSchema),
    initiatePaymentController
)

paymentRouter.post("/webhook", paymentWebhookController);

export default paymentRouter;