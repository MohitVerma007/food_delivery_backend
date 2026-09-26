import { pool } from "../../config/db.js";
import type { CreateRestaurantInput, Restaurant } from "./restarurant.interface.js";



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