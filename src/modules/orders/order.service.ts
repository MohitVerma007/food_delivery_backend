import crypto from "crypto";
import { pool } from '../../config/db.js';

export interface CreateOrderInput {
  addressId: string;
  paymentMethod: "ONLINE" | "COD";
  notes?: string;
}

export const createOrderService = async (
  userId: string,
  idempotencyKey: string,
  input: CreateOrderInput
) => {
  // 1. Calculate SHA-256 Hash of Request Body
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 2. Check Existing Idempotency Key in DB with Row Lock (FOR UPDATE)
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

      // Payload Mismatch Check
      if (record.request_hash !== requestHash) {
        await client.query("ROLLBACK");
        const error = new Error("IDEMPOTENCY_PAYLOAD_MISMATCH");
        (error as any).statusCode = 422;
        throw error;
      }

      // If already processed successfully
      if (record.status === "COMPLETED") {
        await client.query("COMMIT");
        return {
          statusCode: record.response_code,
          body: record.response_body,
        };
      }

      // If still processing
      if (record.status === "IN_PROGRESS") {
        await client.query("ROLLBACK");
        const error = new Error("ORDER_PROCESSING_IN_PROGRESS");
        (error as any).statusCode = 409;
        throw error;
      }
    }

    // 3. Insert 'IN_PROGRESS' Record with request_hash
    await client.query(
      `
      INSERT INTO idempotency_keys (
        user_id, 
        idempotency_key, 
        request_hash, 
        status
      )
      VALUES ($1, $2, $3, 'IN_PROGRESS')
      `,
      [userId, idempotencyKey, requestHash]
    );

    // 4. Fetch Cart & Items
    const cartResult = await client.query(
      `SELECT id, restaurant_id FROM carts WHERE user_id = $1`,
      [userId]
    );
    const cart = cartResult.rows[0];
    if (!cart) throw new Error("CART_EMPTY");

    const cartItemsResult = await client.query(
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
      `,
      [cart.id]
    );
    const cartItems = cartItemsResult.rows;
    if (cartItems.length === 0) throw new Error("CART_EMPTY");

    // 5. Total Calculations
    let subtotalPaise = 0;
    for (const item of cartItems) {
      if (!item.is_available) throw new Error(`ITEM_UNAVAILABLE:${item.name}`);
      subtotalPaise += Number(item.price_paise) * item.quantity;
    }

    const deliveryFeePaise = 4000;
    const taxPaise = Math.round(subtotalPaise * 0.05);
    const totalAmountPaise = subtotalPaise + deliveryFeePaise + taxPaise;

    // 6. Insert Order
    const orderResult = await client.query(
      `
      INSERT INTO orders (
        user_id, restaurant_id, delivery_address_id, status,
        subtotal_paise, tax_paise, delivery_fee_paise, total_paise,
        payment_method, notes
      )
      VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $5, $6, $7, $8, $9)
      RETURNING id, status, total_paise, created_at
      `,
      [
        userId,
        cart.restaurant_id,
        input.addressId,
        subtotalPaise,
        taxPaise,
        deliveryFeePaise,
        totalAmountPaise,
        input.paymentMethod,
        input.notes ?? null,
      ]
    );
    const createdOrder = orderResult.rows[0];

    // 7. Insert Snapshots
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

    // 8. Delete Cart
    await client.query(`DELETE FROM carts WHERE id = $1`, [cart.id]);

    const responsePayload = {
      orderId: createdOrder.id,
      status: createdOrder.status,
      totalPaise: createdOrder.total_paise,
      createdAt: createdOrder.created_at,
    };

    // 9. Update Idempotency Table Status to COMPLETED
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
    await client.query("ROLLBACK");

    // Execution fail hone par IN_PROGRESS record delete kar do taaki client retry kar sake
    await pool.query(
      `
      DELETE FROM idempotency_keys 
      WHERE user_id = $1 AND idempotency_key = $2 AND status = 'IN_PROGRESS'
      `,
      [userId, idempotencyKey]
    );

    throw error;
  } finally {
    client.release();
  }
};