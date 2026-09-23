import { pool } from "../../config/db.js";
import type { CreateRestaurantInput } from "./restarurant.interface.js";



export const createRestaurant = async (
  ownerId: string,
  input: CreateRestaurantInput
) => {
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

export const getRestaurants = async (limit: number, offset: number) => {
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