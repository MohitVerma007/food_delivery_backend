import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { acceptDeliveryController, pickupDeliveryController, completeDeliveryController } from "./deliveries.controller.js";

const router = Router();

router.post(
  "/:deliveryId/accept",
  authenticate,
  authorize("DELIVERY_PARTNER"),
  acceptDeliveryController
);

router.post(
  "/:deliveryId/pickup",
  authenticate,
  authorize("DELIVERY_PARTNER"),
  pickupDeliveryController
);

router.post(
  "/:deliveryId/complete",
  authenticate,
  authorize("DELIVERY_PARTNER"),
  completeDeliveryController
);


export default router;