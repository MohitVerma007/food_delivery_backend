import { type Request, type Response, type NextFunction } from "express";
import { registerUser } from "./auth.service.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {

    const user = await registerUser(req.body);

    return res.status(201).json({
      user
    });

  } catch (error) {

    next(error);

  }
};