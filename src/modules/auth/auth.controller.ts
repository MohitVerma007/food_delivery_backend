import type { Request, Response, NextFunction } from "express";
import { registerUser, getAllUser, loginUser } from "./auth.service.js";

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

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    const data = await getAllUser({page, limit});

    return res.status(200).json(data);
  } catch(error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {

  try {
    const result = await loginUser(
      req.body.email,
      req.body.password
    );

    return res.status(200).json(result);

  } catch (error) {

    next(error);
    
  }
}