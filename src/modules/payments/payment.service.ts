import {pool} from "../../config/db.js";
import { razorpayClient } from "../../config/razorpay.js";

export const createPayment = async (
    userId: string,
    orderId: string,
    idempotencyKey: string
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Check Idempotency Key
        const existing = await client.query(
            `
            SELECT
                id,
                status,
                amount_paise,
                currency,
                provider_payment_id
            FROM payments
            WHERE idempotency_key = $1
            `,
            [idempotencyKey]
        );

        if (existing.rows.length > 0) {
            await client.query("COMMIT");
            return existing.rows[0];
        }


        // 2. Get Order and lock the row using For UPDATE
        const orderResult = await  client.query(
            `
            SELECT
                id,
                user_id,
                total_paise,
                status
            FROM orders
            WHERE id = $1
            FOR UPDATE
            `,
            [orderId]
        );

        const order = orderResult.rows[0];

        if (!order) {
            const err: any = new Error("ORDER_NOT_FOUND");
            err.statusCode = 404;
            throw err;
        }

        // 3. Ownership Check 
        if (order.user_id !== userId){
            const err: any = new Error("FORBIDDEN");
            err.statusCode = 403;
            throw err;
        }

        // 4. Validate Order Status
        if (order.status !== "PENDING_PAYMENT") {
            const err: any = new Error("INVALID_ORDER_PAYMENT_STATE");
            err.statusCode = 400;
            throw err;
        }


        // 5. Create Payment Record with status 'PENDING'
        const paymentResult = await client.query(
            `
            INSERT INTO payments
            (
              order_id,
              provider,
              amount_paise,
              currency,
              status,
              idempotency_key
            )
            Values
            (
              $1,
              $2,
              $3,
              'INR',
              'PENDING',
              $4
            )
              RETURNING *
            `,
            [
                order.id,
                "RAZORPAY",
                order.total_paise,
                idempotencyKey,
            ]
        );


        const payment = paymentResult.rows[0];

        await client.query("COMMIT");

        return payment;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }








}


export const updatePaymentProviderId = async (
  paymentId: string,
  providerPaymentId: string
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Database mein gateway ki payment ID save/update kar rahe hain
    const updateResult = await client.query(
      `
      UPDATE payments
      SET
          provider_payment_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *;
      `,
      [providerPaymentId, paymentId]
    );

    if (updateResult.rows.length === 0) {
      throw new Error("PAYMENT_RECORD_NOT_FOUND");
    }

    await client.query("COMMIT");

    return updateResult.rows[0];

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const initializePaymentService = async (
    userId: string,
    orderId: string,
     idempotencyKey: string
    ) => {
  // Step 1: Database mein PENDING payment record create karo (Transaction & Lock ke sath)
  // (Ye wahi function hai jo aapne upar discuss kiya tha)
  const payment = await createPayment(userId, orderId, idempotencyKey);

  // Step 2: External API Call (Razorpay) - DB Transaction ke BAHAR honi chahiye
  const gatewayOrder = await razorpayClient.orders.create({
    amount: payment.amount_paise,
    currency: payment.currency,
    receipt: payment.order_id,
  });

  // Step 3: Gateway Order ID ko database mein update karo
  const updatedPayment = await updatePaymentProviderId(payment.id, gatewayOrder.id);

  // Return both local payment info and gateway order ID for frontend SDK
  return {
    payment: updatedPayment,
    gatewayOrderId: gatewayOrder.id,
  };
}