import { pool } from "../../config/db.js";
import type { CreateCategoryInput, UpdateCategoryInput,Category } from "./category.interface.js";

export const createCategory = async (
    restaurantId: string,
    input: CreateCategoryInput
) => {
    // Check if restaurant exist
    const restaurant = await pool.query(
        `
        SELECT id
        FROM restaurants
        WHERE id = $1
        `,
        [restaurantId]
    );

    if (restaurant.rows.length === 0 ) {
        const error = new Error("Restaurant not found");
        (error as any).statusCode = 404;
        throw error;
    }

    
  // 2. Check duplicate category name
  const existing = await pool.query(
    `
      SELECT id
      FROM categories
      WHERE restaurant_id = $1
        AND LOWER(name) = LOWER($2)
    `,
    [restaurantId, input.name]
  );

  if (existing.rows.length > 0) {
    const error = new Error(
      "A category with this name already exists in this restaurant."
    );

    (error as any).statusCode = 409;
    throw error;
  }

  // 3. Insert category
  const result = await pool.query(
    `
      INSERT INTO categories
        (
          restaurant_id,
          name,
          display_order
        )
      VALUES
        ($1, $2, $3)
      RETURNING
        id,
        restaurant_id,
        name,
        display_order,
        created_at
    `,
    [
      restaurantId,
      input.name,
      input.display_order ?? 0,
    ]
  );

  return result.rows[0];
}