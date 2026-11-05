import { Router } from "express";

import { getUsers, register, login } from "./auth.controller.js";

import { validate } from "../../middlewares/validate.middleware.js";

import {
  loginSchema,
  registerSchema
} from "./auth.schema.js";
import { rateLimit } from "../../middlewares/rate_limit.middleware.js";
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
  rateLimit(3, 60), // Limit to 3 requests per minute
  validate(loginSchema),
  login
)

router.get("/",  getUsers)

export default router;