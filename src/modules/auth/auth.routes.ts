import { Router } from "express";

import { getUsers, register } from "./auth.controller.js";

import { validate } from "../../middlewares/validate.middleware.js";

import {
  registerSchema
} from "./auth.schema.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  register
);

router.get("/", authenticate, authorize("ADMIN"), getUsers)

export default router;