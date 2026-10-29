import { pool } from "../../config/db.js";
import crypto from "node:crypto";

export const verifyWebhookSignature = (
  rawBody: Buffer | string,
  signature: string,
  secret: string,
): boolean => {
  if (!/^[a-f\d]{64}$/i.test(signature)) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest();
  const receivedSignature = Buffer.from(signature, "hex");

  console.log("Expected Signature:", expectedSignature.toString("hex"));
  console.log("Received Signature:", receivedSignature.toString("hex"));

  return (
    expectedSignature.length === receivedSignature.length &&
    crypto.timingSafeEqual(expectedSignature, receivedSignature)
  );
};

export const handlePaymentSuccess = async (
  provider: string,
  providerEventId: string,
  providerPaymentId: string,
  webhookAmountPaise: number
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Store webhook event to prevent duplicate processing (Idempotency)
    const eventResult = await client.query(
      `
      INSERT INTO payment_webhook_events
      (provider, provider_event_id, event_type, payload)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (provider, provider_event_id)
      DO NOTHING
      RETURNING id
      `,
      [
        provider,
        providerEventId,
        "payment.success",
        JSON.stringify({ providerPaymentId }),
      ]
    );

    // Agar event pehle process ho chuka hai, toh turant exit karo
    if (eventResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { status: "ALREADY_PROCESSED" };
    }

    // 2. Lock and fetch payment record
    const paymentResult = await client.query(
      `
      SELECT id, order_id, amount_paise, status
      FROM payments
      WHERE provider = $1 AND provider_payment_id = $2
      FOR UPDATE
      `,
      [provider, providerPaymentId]
    );

    const payment = paymentResult.rows[0];

    if (!payment) {
      throw new Error("PAYMENT_NOT_FOUND");
    }

    // 3. Amount Verification (Critical Step!)
    if (Number(payment.amount_paise) !== webhookAmountPaise) {
      throw new Error("PAYMENT_AMOUNT_MISMATCH");
    }

    // 4. Agar payment already successful hai
    if (payment.status === "SUCCESS") {
      await client.query("COMMIT");
      return { status: "ALREADY_SUCCESS" };
    }

    // 5. Update payment status to SUCCESS
    await client.query(
      `
      UPDATE payments
      SET status = 'SUCCESS', updated_at = NOW()
      WHERE id = $1
      `,
      [payment.id]
    );

    // 6. Update order status to CONFIRMED (Conditional update)
    await client.query(
      `
      UPDATE orders
      SET status = 'CONFIRMED', updated_at = NOW()
      WHERE id = $1 AND status = 'PENDING_PAYMENT'
      `,
      [payment.order_id]
    );

    // 7. Write Outbox Event for Restaurant/Notification service
    await client.query(
      `
      INSERT INTO outbox_events (event_type, aggregate_id, payload)
      VALUES ($1, $2, $3)
      `,
      [
        "PAYMENT_SUCCESS",
        payment.order_id,
        JSON.stringify({
          orderId: payment.order_id,
          paymentId: payment.id,
        }),
      ]
    );

    await client.query("COMMIT");
    return { status: "SUCCESS" };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
