import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { env } from "../../config/env.js";
import {initializePaymentService} from "./payment.service.js";
import { razorpayClient } from "../../config/razorpay.js";
import { verifyWebhookSignature, handlePaymentSuccess } from "./payment.webhook.service.js";

/**
 * 1. Create Payment Controller
 * POST /api/v1/payments/create_payment
 */
export const initiatePaymentController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) {
      return res.status(400).json({
        error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key header is required" },
      });
    }

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({
        error: { code: "ORDER_ID_REQUIRED", message: "orderId is required in request body" },
      });
    }

    const userId = req.user!.id;

    // Service ko call karo jo saara heavy lifting (DB + Gateway) handle karegi
    const result = await initializePaymentService(userId, orderId, idempotencyKey);

    return res.status(201).json({
      status: "SUCCESS",
      data: {
        paymentId: result.payment.id,
        gatewayOrderId: result.gatewayOrderId,
        amount: result.payment.amount_paise,
        currency: result.payment.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Frontend SDK ke liye
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Payment Webhook Controller
 * POST /api/v1/payments/webhook
 */
export const paymentWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.header("X-Razorpay-Signature");

    if (!signature) {
      return res.status(400).json({
        error: {
          code: "SIGNATURE_MISSING",
          message: "Webhook signature header is missing",
        },
      });
    }

    if (!env.razorpayWebhookSecret) {
      return res.status(500).json({
        error: {
          code: "WEBHOOK_SECRET_NOT_CONFIGURED",
          message: "Razorpay webhook secret is not configured",
        },
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        error: {
          code: "RAW_BODY_REQUIRED",
          message: "Webhook request must be received as a raw JSON body",
        },
      });
    }

    const rawBody = req.body;
    if (
      !verifyWebhookSignature(
        rawBody,
        signature,
        env.razorpayWebhookSecret
      )
    ) {
      return res.status(401).json({
        error: {
          code: "INVALID_SIGNATURE",
          message: "Webhook signature is invalid",
        },
      });
    }

    let eventData: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            amount?: number;
          };
        };
      };
    };

    try {
      eventData = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({
        error: {
          code: "INVALID_WEBHOOK_PAYLOAD",
          message: "Webhook body must contain valid JSON",
        },
      });
    }

    if (eventData.event !== "payment.captured") {
      return res.status(200).json({ received: true });
    }

    const providerEventId = req.header("X-Razorpay-Event-Id");
    const providerPaymentId = eventData.payload?.payment?.entity?.id;
    const webhookAmountPaise = eventData.payload?.payment?.entity?.amount;

    if (
      !providerEventId ||
      !providerPaymentId ||
      typeof webhookAmountPaise !== "number"
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_WEBHOOK_PAYLOAD",
          message: "Webhook is missing its event ID, payment ID, or amount",
        },
      });
    }

    await handlePaymentSuccess(
      "RAZORPAY",
      providerEventId,
      providerPaymentId,
      webhookAmountPaise
    );

    return res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};


