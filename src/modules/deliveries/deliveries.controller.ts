import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { acceptDelivery, pickupDelivery, completeDelivery } from "./deliveries.service.js";


export const acceptDeliveryController = async (
  req: AuthRequest,
  res: Response,
    next: NextFunction
) => {
  try {
    const { deliveryId } = req.params as { deliveryId: string };
    const result = await acceptDelivery(req.user!.id, deliveryId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


export const pickupDeliveryController = async (
  req: AuthRequest,
  res: Response,
    next: NextFunction
) => {
  try {
    const { deliveryId } = req.params as { deliveryId: string };
    const result = await pickupDelivery(req.user!.id, deliveryId);
    res.json(result);
  } catch (error) {
    next(error);
    }
}


export const completeDeliveryController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try { 
    const { deliveryId } = req.params as { deliveryId: string };
    const result = await completeDelivery(req.user!.id, deliveryId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
