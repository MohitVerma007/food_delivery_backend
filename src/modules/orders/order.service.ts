import crypto from "crypto";
import { pool } from "../../config/db.js";

export interface CreateOrderInput {
  address: string;
  paymentMethod: "ONLINE" | "COD";
  notes?: string;
}

export const mycreateOrderService = async (
  userId: string,
  idempotencyKey: string,
  input: CreateOrderInput
) => {
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Lock / Check Idempotency Key
    const keyCheckResult = await client.query(
      `
      SELECT status, request_hash, response_code, response_body
      FROM idempotency_keys
      WHERE user_id = $1 AND idempotency_key = $2
      FOR UPDATE
      `,
      [userId, idempotencyKey]
    );

    if (keyCheckResult.rows.length > 0) {
      const record = keyCheckResult.rows[0];

      if (record.request_hash !== requestHash) {
        await client.query("ROLLBACK");
        const error: any = new Error("IDEMPOTENCY_PAYLOAD_MISMATCH");
        error.statusCode = 422;
        throw error;
      }

      if (record.status === "COMPLETED") {
        await client.query("COMMIT");
        return {
          statusCode: record.response_code,
          body: record.response_body,
        };
      }

      if (record.status === "IN_PROGRESS") {
        await client.query("ROLLBACK");
        const error: any = new Error("ORDER_PROCESSING_IN_PROGRESS");
        error.statusCode = 409;
        throw error;
      }
    } else {
      // Direct Insert with Race-Condition handling
      try {
        await client.query(
          `
          INSERT INTO idempotency_keys (user_id, idempotency_key, request_hash, status)
          VALUES ($1, $2, $3, 'IN_PROGRESS')
          `,
          [userId, idempotencyKey, requestHash]
        );
      } catch (err: any) {
        if (err.code === "23505") { // Unique Constraint Violation
          await client.query("ROLLBACK");
          const error: any = new Error("ORDER_PROCESSING_IN_PROGRESS");
          error.statusCode = 409;
          throw error;
        }
        throw err;
      }
    }

    // 2. Fetch Cart
    const cartResult = await client.query(
      `SELECT id, restaurant_id FROM carts WHERE user_id = $1`,
      [userId]
    );
    const cart = cartResult.rows[0];

    if (!cart) {
      const err: any = new Error("CART_EMPTY");
      err.statusCode = 400;
      throw err;
    }

    // Lock menu_items to prevent concurrent price/availability changes
    const cartItemResult = await client.query(
      `
      SELECT
        ci.menu_item_id,
        ci.quantity,
        mi.name,
        mi.price_paise,
        mi.is_available
      FROM cart_items ci
      JOIN menu_items mi ON mi.id = ci.menu_item_id
      WHERE ci.cart_id = $1
      FOR SHARE OF mi
      `,
      [cart.id]
    );

    const cartItems = cartItemResult.rows;
    if (cartItems.length === 0) {
      const error: any = new Error("CART_EMPTY");
      error.statusCode = 400;
      throw error;
    }

    // 3. Price Calculation & Availability Check
    let subtotal_paise = 0;
    for (const item of cartItems) {
      if (!item.is_available) {
        const err: any = new Error(`ITEM_UNAVAILABLE: ${item.name}`);
        err.statusCode = 400;
        throw err;
      }
      subtotal_paise += Number(item.price_paise) * item.quantity;
    }

    const deliveryFeePaise = 4000;
    const taxPaise = Math.round(subtotal_paise * 0.05);
    const totalAmountPaise = subtotal_paise + deliveryFeePaise + taxPaise;

    // 4. Create Order
    const orderResult = await client.query(
      `
      INSERT INTO orders (
        user_id, restaurant_id, delivery_address, status,
        subtotal_paise, tax_paise, delivery_fee_paise, total_paise,
        payment_method, notes        
      )
      VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, $6, $7, $8, $9)
      RETURNING id, status, total_paise, created_at
      `,
      [
        userId,
        cart.restaurant_id,
        input.address,
        subtotal_paise,
        taxPaise,
        deliveryFeePaise,
        totalAmountPaise,
        input.paymentMethod,
        input.notes ?? null,
      ]
    );

    const createdOrder = orderResult.rows[0];

    // 5. Create Snapshot Items
    for (const item of cartItems) {
      await client.query(
        `
        INSERT INTO order_items (
          order_id, menu_item_id, item_name, unit_price_paise, quantity, total_price_paise    
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          createdOrder.id,
          item.menu_item_id,
          item.name,
          item.price_paise,
          item.quantity,
          Number(item.price_paise) * item.quantity,
        ]
      );
    }

    // 6. Clear Cart
    await client.query(`DELETE FROM carts WHERE id = $1`, [cart.id]);

    // 7. Write Outbox Event
    await client.query(
      `
      INSERT INTO outbox_events (event_type, aggregate_id, payload)
      VALUES ($1, $2, $3)
      `,
      [
        "ORDER_CREATED",
        createdOrder.id,
        JSON.stringify({
          orderId: createdOrder.id,
          userId,
          restaurantId: cart.restaurant_id,
        }),
      ]
    );

    const responsePayload = {
      orderId: createdOrder.id,
      status: createdOrder.status,
      totalPaise: createdOrder.total_paise,
      createdAt: createdOrder.created_at,
    };

    // 8. Update Idempotency Record to COMPLETED
    await client.query(
      `
      UPDATE idempotency_keys
      SET status = 'COMPLETED',
          response_code = 201,
          response_body = $1,
          updated_at = NOW()
      WHERE user_id = $2 AND idempotency_key = $3
      `,
      [JSON.stringify(responsePayload), userId, idempotencyKey]
    );

    await client.query("COMMIT");

    return {
      statusCode: 201,
      body: responsePayload,
    };

  } catch (error) {
    // 1. Rollback wrapped in try-catch to avoid breaking the main error flow
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Failed to rollback transaction:", rollbackErr);
    }

    // 2. Separate fresh connection to clean up idempotency key
    try {
      await pool.query(
        `
        DELETE FROM idempotency_keys
        WHERE user_id = $1 AND idempotency_key = $2 AND status = 'IN_PROGRESS'
        `,
        [userId, idempotencyKey]
      );
    } catch (cleanupErr) {
      console.error("Failed to clean up idempotency key:", cleanupErr);
    }

    // Main business/validation error throw hoga controller tak
    throw error;
  } finally {
    client.release();
  }
};