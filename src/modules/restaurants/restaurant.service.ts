import { pool } from "../../config/db.js";
import type { CreateRestaurantInput, Restaurant } from "./restarurant.interface.js";

type RestaurantAction =
  | "ACCEPT"
  | "REJECT"
  | "PREPARING"
  | "READY";

const transitions = {
  ACCEPT: {
    from: "CONFIRMED",
    to: "RESTAURANT_ACCEPTED",
    event: "RESTAURANT_ORDER_ACCEPTED"
  },
  REJECT: {
    from: "CONFIRMED",
    to: "CANCELLED",
    event: "RESTAURANT_ORDER_REJECTED"
  },
  PREPARING: {
    from: "RESTAURANT_ACCEPTED",
    to: "PREPARING",
    event: "ORDER_PREPARING"
  },
  READY: {
    from: "PREPARING",
    to: "READY_FOR_PICKUP",
    event: "ORDER_READY_FOR_PICKUP"
  }
} as const;


export const updateRestaurantOrder = async (
  userId: string,
  restaurantId: string,
  orderId: string,
  action: RestaurantAction,
  reason?: string
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Verify restaurant ownership
    const ownerResult = await client.query(
      `
      SELECT id
      FROM restaurants
      WHERE id = $1
        AND owner_id = $2
      `,
      [restaurantId, userId]
    );

    if (ownerResult.rowCount === 0) {
      throw new Error("RESTAURANT_ACCESS_DENIED");
    }

    // 2. Lock the order while processing
    const orderResult = await client.query(
      `
      SELECT id, status
      FROM orders
      WHERE id = $1
        AND restaurant_id = $2
      FOR UPDATE
      `,
      [orderId, restaurantId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const transition = transitions[action];

    // 3. Validate state transition
    if (order.status !== transition.from) {
      throw new Error("INVALID_ORDER_TRANSITION");
    }

    // 4. Update order
    const updateResult = await client.query(
      `
      UPDATE orders
      SET
        status = $1,
        cancellation_reason = $2,
        updated_at = NOW()
      WHERE id = $3
        AND restaurant_id = $4
        AND status = $5
      RETURNING id, status, updated_at
      `,
      [
        transition.to,
        action === "REJECT" ? reason : null,
        orderId,
        restaurantId,
        transition.from
      ]
    );

    if (updateResult.rowCount !== 1) {
      throw new Error("INVALID_ORDER_TRANSITION");
    }

    const updatedOrder = updateResult.rows[0];

    // 5. Save event in the same transaction
    await client.query(
      `
      INSERT INTO outbox_events (
        event_type,
        aggregate_id,
        payload
      )
      VALUES ($1, $2, $3::jsonb)
      `,
      [
        transition.event,
        orderId,
        JSON.stringify({
          orderId,
          restaurantId,
          status: updatedOrder.status
        })
      ]
    );

    await client.query("COMMIT");

    return updatedOrder;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}



export const createRestaurant = async (
  ownerId: string,
  input: CreateRestaurantInput
): Promise<Restaurant> => {
  const normalizedName = input.name.trim();

  // 1. Check duplicate restaurant name for the same owner
  const existing = await pool.query(
    `SELECT id FROM restaurants WHERE owner_id = $1 AND LOWER(name) = LOWER($2)`,
    [ownerId, normalizedName]
  );

  if (existing.rows.length > 0) {
    const error = new Error("You already have a restaurant with this name.");
    (error as any).statusCode = 409; // Conflict Status Code
    throw error;
  }

  // 2. Insert new restaurant
  const result = await pool.query(
    `
      INSERT INTO restaurants
        (
          owner_id,
          name,
          description,
          address,
          latitude,
          longitude
        )
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        owner_id,
        name,
        description,
        address,
        latitude,
        longitude,
        is_active,
        created_at
    `,
    [
      ownerId,
      normalizedName,
      input.description ?? null,
      input.address,
      input.latitude,
      input.longitude,
    ]
  );

  return result.rows[0];
};

export const getRestaurants = async (limit: number, offset: number) : Promise<Restaurant[]> => {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        description,
        address,
        latitude,
        longitude
      FROM restaurants
      WHERE is_active = TRUE
      ORDER BY created_at DESC
      LIMIT $1
      OFFSET $2
    `,
    [limit, offset]
  );

  return result.rows;
};

export const getRestaurantById = async (
  restaurantId: string
): Promise<Restaurant | null> => {
  const result = await pool.query(
    `SELECT
      id,
      name,
      description,
      address,
      latitude, 
      longitude,
      created_at
    FROM restaurants
    WHERE id = $1 AND is_active = TRUE`,
    [restaurantId]
  );

 
  return result.rows[0] || null;
};


export const updateRestaurant = async (
  restaurantId: string,
  input: Partial<CreateRestaurantInput>
): Promise<Restaurant | null> => {
  const fieldsToUpdate: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let index = 1;

  // Dynamic field check & query building
  if (input.name !== undefined) {
    fieldsToUpdate.push(`name = $${index++}`);
    values.push(input.name.trim());
  }

  if (input.description !== undefined) {
    fieldsToUpdate.push(`description = $${index++}`);
    values.push(input.description);
  }

  if (input.address !== undefined) {
    fieldsToUpdate.push(`address = $${index++}`);
    values.push(input.address);
  }

  if (input.latitude !== undefined) {
    fieldsToUpdate.push(`latitude = $${index++}`);
    values.push(input.latitude);
  }

  if (input.longitude !== undefined) {
    fieldsToUpdate.push(`longitude = $${index++}`);
    values.push(input.longitude);
  }

  // Handle empty payload case
  if (fieldsToUpdate.length === 0) {
    const error = new Error("No fields provided for update.");
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  // Add restaurantId as final parameterized query value
  values.push(restaurantId);

  const updateQuery = `
    UPDATE restaurants
    SET ${fieldsToUpdate.join(", ")}
    WHERE id = $${index}
      AND is_active = TRUE
    RETURNING
      id,
      name,
      description,
      address,
      latitude,
      longitude,
      created_at
  `;

  const result = await pool.query(updateQuery, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as Restaurant;
};

