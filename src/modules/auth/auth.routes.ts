import { Router } from "express";

import { getUsers, register, login } from "./auth.controller.js";

import { validate } from "../../middlewares/validate.middleware.js";

import {
  loginSchema,
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

router.post(
  "/login",
  validate(loginSchema),
  login
)

router.get("/", authenticate, authorize("ADMIN"), getUsers)

export default router;