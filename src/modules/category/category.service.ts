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

export const getCategoryById = async (
    categoryId: string
    ): Promise<Category | null> => {
    const result = await pool.query(
        `SELECT id, restaurant_id, name, display_order, created_at
          FROM categories
          WHERE id = $1`,
          [categoryId]
    );
    return result.rows[0] || null;
}

export const getCategories = async (
    restaurantId: string,
    limit: number,
    offset: number
): Promise<Category[]> => {
    const result = await pool.query(
        `SELECT id, restaurant_id, name, display_order, created_at
          FROM categories
          WHERE restaurant_id = $1
          ORDER BY display_order ASC, created_at DESC
          LIMIT $2 OFFSET $3`,
          [restaurantId, limit, offset]
    );
    return result.rows;
}

export const updateCategory = async (
    categoryId: string,
    input: UpdateCategoryInput
): Promise<Category | null> => {
    // Check if category exists
    const existingCategory = await getCategoryById(categoryId);
    if (!existingCategory) {
        const error = new Error("Category not found");
        (error as any).statusCode = 404;
        throw error;
    }

    // Check for duplicate name (excluding the current category)
    const duplicate = await pool.query(
        `
          SELECT id
          FROM categories
          WHERE restaurant_id = $1
            AND LOWER(name) = LOWER($2)
            AND id != $3
        `,
        [existingCategory.restaurant_id, input.name, categoryId]
    );

    if (duplicate.rows.length > 0) {
        const error = new Error(
            "A category with this name already exists in this restaurant."
        );
        (error as any).statusCode = 409;
        throw error;
    }

    // Update category
    const result = await pool.query(
        `
          UPDATE categories
          SET name = $1, display_order = $2
          WHERE id = $3
          RETURNING id, restaurant_id, name, display_order, created_at
        `,
        [
            input.name,
            input.display_order ?? existingCategory.display_order,
            categoryId
        ]
    );

    return result.rows[0] || null;
};

export const deleteCategory = async (
  categoryId: string
): Promise<void> => {
  const existingCategory = await getCategoryById(categoryId);

  if (!existingCategory) {
    const error = new Error("Category not found");
    (error as any).statusCode = 404;
    throw error;
  }

  await pool.query(
    `
      DELETE FROM categories
      WHERE id = $1
    `,
    [categoryId]
  );
};