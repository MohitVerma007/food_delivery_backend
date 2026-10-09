import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { type CreateOrderInput, mycreateOrderService } from "./order.service.js";

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