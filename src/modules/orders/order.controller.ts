import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { getOrderServiceById, mycreateOrderService, getAllOrders } from "./order.service.js";

export const createOrderController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {

        // Idempotency Key Validation

        const idempotencyKey = req.headers["x-idempotency-key"] as string;
        if (!idempotencyKey){
            return res.status(400).json({
                success: false,
                error: "MISSING_IDEMPOTENCY_KEY",
                message: "X-Idempotency-Key header is required"
            })
        }

        const result = await mycreateOrderService(req.user!.id, idempotencyKey, req.body)

        return res.status(result.statusCode).json({
            success: true,
            data: result.body,
        });



    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: {
                    code: error.message,
                    message: error.message,
                }
            })
        }

        next(error)
    }
}

export const getOrdersbyIdController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        
        const userId = req.user!.id;
        const orderId = req.query.orderId as string;

        const orders = await getOrderServiceById(userId, orderId);
        console.log("Fetched orders:", orders);

        return res.status(200).json({
            success: true,
            data: orders,
        }); 

    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: {
                    code: error.message,
                    message: error.message,
                }
            })
        }
    }
}

export const getOrdersController = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = req.user!.id;
        const orders = await getAllOrders(userId);

        return res.status(200).json({
            success: true,
            data: orders,
        });
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                error: {
                    code: error.message,
                    message: error.message,
                }
            })
        }
        next(error);
    }
}