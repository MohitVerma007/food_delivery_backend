import { pool } from "../../config/db.js";

export async function acceptDelivery(
  userId: string,
  deliveryId: string
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Find the partner for this user
    const partnerResult = await client.query(
      `
      SELECT id, availability
      FROM delivery_partners
      WHERE user_id = $1
      FOR UPDATE
      `,
      [userId]
    );

    const partner = partnerResult.rows[0];

    if (!partner) {
      throw new Error("PARTNER_NOT_FOUND");
    }

    if (partner.availability !== "ONLINE") {
      throw new Error("PARTNER_NOT_AVAILABLE");
    }

    // 2. Lock the delivery
    const deliveryResult = await client.query(
      `
      SELECT id, order_id, partner_id, status
      FROM deliveries
      WHERE id = $1
      FOR UPDATE
      `,
      [deliveryId]
    );

    const delivery = deliveryResult.rows[0];

    if (!delivery) {
      throw new Error("DELIVERY_NOT_FOUND");
    }

    // 3. Only the assigned partner can accept
    if (delivery.partner_id !== partner.id) {
      throw new Error("DELIVERY_NOT_ASSIGNED_TO_YOU");
    }

    if (delivery.status !== "ASSIGNED") {
      throw new Error("DELIVERY_NOT_AVAILABLE");
    }

    // 4. Accept the delivery
    const updated = await client.query(
      `
      UPDATE deliveries
      SET
        status = 'ACCEPTED',
        accepted_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
        AND partner_id = $2
        AND status = 'ASSIGNED'
      RETURNING id, order_id, partner_id, status
      `,
      [deliveryId, partner.id]
    );

    if (updated.rowCount !== 1) {
      throw new Error("DELIVERY_NOT_AVAILABLE");
    }

    // 5. Mark partner busy
    await client.query(
      `
      UPDATE delivery_partners
      SET
        availability = 'BUSY',
        updated_at = NOW()
      WHERE id = $1
        AND availability = 'ONLINE'
      `,
      [partner.id]
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}



export async function pickupDelivery(
  userId: string,
  deliveryId: string
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT
        d.id,
        d.order_id,
        d.status AS delivery_status,
        o.status AS order_status
      FROM deliveries d
      JOIN delivery_partners p
        ON p.id = d.partner_id
      JOIN orders o
        ON o.id = d.order_id
      WHERE d.id = $1
        AND p.user_id = $2
      FOR UPDATE OF d, o
      `,
      [deliveryId, userId]
    );

    const delivery = result.rows[0];

    if (!delivery) {
      throw new Error("DELIVERY_NOT_FOUND");
    }

    if (
      delivery.delivery_status !== "ACCEPTED" ||
      delivery.order_status !== "READY_FOR_PICKUP"
    ) {
      throw new Error("INVALID_DELIVERY_TRANSITION");
    }

    await client.query(
      `
      UPDATE deliveries
      SET
        status = 'PICKED_UP',
        picked_up_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      `,
      [deliveryId]
    );

    await client.query(
      `
      UPDATE orders
      SET
        status = 'OUT_FOR_DELIVERY',
        updated_at = NOW()
      WHERE id = $1
      `,
      [delivery.order_id]
    );

    await client.query(
      `
      INSERT INTO outbox_events
        (event_type, aggregate_id, payload)
      VALUES ($1, $2, $3::jsonb)
      `,
      [
        "ORDER_PICKED_UP",
        delivery.order_id,
        JSON.stringify({
          orderId: delivery.order_id,
          deliveryId
        })
      ]
    );

    await client.query("COMMIT");

    return {
      deliveryId,
      status: "PICKED_UP",
      orderStatus: "OUT_FOR_DELIVERY"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}




export async function completeDelivery(
  userId: string,
  deliveryId: string
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT
        d.id,
        d.order_id,
        d.partner_id,
        d.status AS delivery_status,
        o.status AS order_status
      FROM deliveries d
      JOIN delivery_partners p
        ON p.id = d.partner_id
      JOIN orders o
        ON o.id = d.order_id
      WHERE d.id = $1
        AND p.user_id = $2
      FOR UPDATE OF d, o
      `,
      [deliveryId, userId]
    );

    const delivery = result.rows[0];

    if (!delivery) {
      throw new Error("DELIVERY_NOT_FOUND");
    }

    if (
      delivery.delivery_status !== "PICKED_UP" ||
      delivery.order_status !== "OUT_FOR_DELIVERY"
    ) {
      throw new Error("INVALID_DELIVERY_TRANSITION");
    }

    await client.query(
      `
      UPDATE deliveries
      SET
        status = 'DELIVERED',
        delivered_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      `,
      [deliveryId]
    );

    await client.query(
      `
      UPDATE orders
      SET
        status = 'DELIVERED',
        updated_at = NOW()
      WHERE id = $1
      `,
      [delivery.order_id]
    );

    await client.query(
      `
      UPDATE delivery_partners
      SET
        availability = 'ONLINE',
        updated_at = NOW()
      WHERE id = $1
        AND availability = 'BUSY'
      `,
      [delivery.partner_id]
    );

    await client.query(
      `
      INSERT INTO outbox_events
        (event_type, aggregate_id, payload)
      VALUES ($1, $2, $3::jsonb)
      `,
      [
        "ORDER_DELIVERED",
        delivery.order_id,
        JSON.stringify({
          orderId: delivery.order_id,
          deliveryId
        })
      ]
    );

    await client.query("COMMIT");

    return {
      deliveryId,
      deliveryStatus: "DELIVERED",
      orderStatus: "DELIVERED"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}