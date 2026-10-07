import crypto from "crypto";
import { pool } from "../../config/db.js";
import { error } from 'node:console';

export interface CreateOrderInput {
  address: string;
  paymentMethod: "ONLINE" | "COD";
  notes?: string;
}

export const createOrderService = async (
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

    // 1. Lock/Reserve Idempotency Key upfront via UPSERT pattern
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
      // Insert 'IN_PROGRESS' record safely inside transaction
      await client.query(
        `
        INSERT INTO idempotency_keys (user_id, idempotency_key, request_hash, status)
        VALUES ($1, $2, $3, 'IN_PROGRESS')
        `,
        [userId, idempotencyKey, requestHash]
      );
    }

    // 2. Fetch Cart & Validate
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
    if (cartItems.length === 0) {
      const err: any = new Error("CART_EMPTY");
      err.statusCode = 400;
      throw err;
    }

    // 3. Price Calculation & Availability Check
    let subtotalPaise = 0;
    for (const item of cartItems) {
      if (!item.is_available) {
        const err: any = new Error(`ITEM_UNAVAILABLE:${item.name}`);
        err.statusCode = 400;
        throw err;
      }
      subtotalPaise += Number(item.price_paise) * item.quantity;
    }

    const deliveryFeePaise = 4000;
    const taxPaise = Math.round(subtotalPaise * 0.05);
    const totalAmountPaise = subtotalPaise + deliveryFeePaise + taxPaise;

    // 4. Create Order
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
        input.address,
        subtotalPaise,
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

    // 7. Write Outbox Event (Transactional Event Pattern)
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
    await client.query("ROLLBACK");

    // Clean up IN_PROGRESS key safely
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

    throw error;
  } finally {
    client.release();
  }
};


export const mycreateOrderService = async(
  userId: string,
  idempotencyKey: string,
  input: CreateOrderInput
) => {


  // create request hash using json body
  const requestHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")

  //Separate Client for handling Transaction
  const client = await pool.connect();

  try { 
    await client.query("BEGIN")  // Transation Start

    // 1. Lock/ Reserve Idempotency Key upfront via UPSERT pattern 
          // ( FOR UPDATE = Row-Level Lock (Pessimistic Lock))

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

      // Checking req hash like if attacker get idempotency key 
      if(record.request_hash !== requestHash){
        await client.query("ROLLBACK");
        const error: any = new Error("IDEMPOTENCY_PAYLOAD_MISMATCH");
        //422 Unprocessable Entity (Validation FailureBusiness rule mismatch)
        error.statusCode = 422; 
        throw error;
      }


      // If process already completed then just return the response
      if(record.status === "COMPLETED"){
        await client.query("COMMIT");
        return {
          statusCode: record.response_code,
          body: record.response_body,
        };
      }

      // Handling duplicate request while processing
      if(record.status === "IN_PROGRESS") {
        await client.query("ROLLBACK");
        const error: any = new Error("ORDER_PROCESSING_IN_PROGRESS");
        error.statusCode = 409;
        throw error;
      }

    } else {
      // Insert "IN_PROGRESS" record safely inside transaction
      await client.query(
        `
        INSERT INTO idempotency_keys (user_id, idempotency_key, request_hash, status)
        VALUES ($1, $2, $3, $4, 'IN_PROGRESS')
        `,
        [userId, idempotencyKey, requestHash]
      );
    }



    // 2. Fetch Cart & Validate
    const cartResult =await client.query(
      `SELECT id, restaurant_id FROM carts WHERE user_id = $1`,
      [userId]
    );
    const cart = cartResult.rows[0];

    if(!cart) {
      const err: any = new Error("CART_EMPTY");
      err.statusCode = 400;
      throw err;
    }

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
      `,
      [cart.id]
    );

    const cartItems = cartItemResult.rows;
    if(cartItems.length === 0) {
      const error: any = new Error("CART_EMPTY");
      error.statusCode = 400;
      throw error;
    }


    // 3. Price Calculation & Availability Check
    let subtotal_paise = 0;
    for (const item of cartItems){
      if (!item.is_available) {
        const err: any = new Error(`ITEM_UNAVAILABLE: ${item.name}`);
        err.statusCode = 400;
        throw err;
      }
      subtotal_paise += Number(item.price_paise) * item.quantity;
    }


    const deliveryFeePaise = 4000;
    const taxPaise  = Math.round(subtotal_paise * 0.05);
    const totalAmountPaise = subtotal_paise + deliveryFeePaise + taxPaise;


    // 4. Create 
    
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
    for ( const item of cartItems){
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
      )
    }

    // 6. Clear Cart
    await client.query(`DELETE FROM carts WHERE id = $1`, [cart.id]);


    // 7. Write Outbox Event (Transactional Event Pattern)
    await client.query(
      `
      INSERT INTO outbox_events (event_type, aggregate_id, payload)
      VALUES ($1, $2, $3)
      `,
      [
        "ORDER_CREATED",
        createdOrder.id,   // aggregate_id is main resource id
        JSON.stringify({    // payload contain all required data for other services without calling order records
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
    }


    // 8. Update Idempotency Record to Completed
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

    // ** HERE We ROLLBACK Everything if any failure occur during transaction
    await client.query("ROLLBACK")

    try {

      // Transaction rollback hone ke baad client connection unstable ho sakta hai. Isliye fresh connection (pool.query) use kiya taaki cleanup guarantee ke saath execute ho aur main catch block interrupt na ho.
      
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

    throw error;
  } finally {
    client.release();
  }






















}