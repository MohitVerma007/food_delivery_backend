import { Router } from "express";

import { register } from "./auth.controller.js";

import { validate } from "../../middlewares/validate.middleware.js";

import {
  registerSchema
} from "./auth.schema.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  register
);

export default router;