import { pool } from "../../config/db.js";
import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
  MenuItem,
  RestaurantMenu,
  RestaurantMenuItemRow,
  MenuCategory,
} from "./menu.interface.js";




export const createMenu = async (
  restaurantId: string,
  input: CreateMenuItemInput
): Promise<MenuItem> => {
  const name = input.name.trim();

  // 1. Check restaurant exists
  const restaurant = await pool.query(
    `
      SELECT id
      FROM restaurants
      WHERE id = $1
        AND is_active = TRUE
    `,
    [restaurantId]
  );

  if (restaurant.rows.length === 0) {
    const error = new Error("Restaurant not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  // 2. Check category belongs to restaurant if category_id is provided
    const category = await pool.query(
      `
        SELECT id
        FROM categories
        WHERE id = $1
          AND restaurant_id = $2
      `,
      [input.category_id, restaurantId]
    );

    if (input.category_id && category.rows.length === 0) {
      const error = new Error("Category not found or does not belong to the restaurant");
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }


  // 2. Check duplicate menu item name
  const existing = await pool.query(
    `
      SELECT id
      FROM menu_items
      WHERE restaurant_id = $1
        AND LOWER(name) = LOWER($2)
    `,
    [restaurantId, name]
  );

  if (existing.rows.length > 0) {
    const error = new Error(
      "Menu item with this name already exists"
    );

    (error as Error & { statusCode?: number }).statusCode = 409;
    throw error;
  }

  // 3. Insert menu item
  const result = await pool.query(
    `
      INSERT INTO menu_items (
        restaurant_id,
        category_id,
        name,
        description,
        price_paise,
        is_available,
        image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        restaurant_id,
        category_id,
        name,
        description,
        price_paise,
        is_available,
        image_url,
        created_at,
        updated_at
    `,
    [
      restaurantId,
      input.category_id ?? null,
      name,
      input.description?.trim() ?? null,
      input.price_paise,
      input.is_available ?? true,
      input.image_url ?? null,
    ]
  );

  return result.rows[0];
};


export const updateMenu = async (
  menuItemId: string,
  input: UpdateMenuItemInput
): Promise<MenuItem> => {
  // Check if menu item exist
  const existingMenuItem = await pool.query(
    `
        SELECT id, restaurant_id, category_id, name, description, price_paise, is_available, image_url, created_at, updated_at
        FROM menu_items
        WHERE id = $1
        `,
    [menuItemId]
  );

  if (existingMenuItem.rows.length === 0) {
    const error = new Error("Menu item not found");
    (error as any).statusCode = 404;
    throw error;
  }

  // 2. Update menu item and bulid dynamic query
  const fieldsToUpdate: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.category_id !== undefined) {
    fieldsToUpdate.push(`category_id = $${index}`);
    values.push(input.category_id);
    index++;
  }
  if (input.name !== undefined) {
    fieldsToUpdate.push(`name = $${index}`);
    values.push(input.name);
    index++;
  }
  if (input.description !== undefined) {
    fieldsToUpdate.push(`description = $${index}`);
    values.push(input.description);
    index++;
  }
  if (input.price_paise !== undefined) {
    fieldsToUpdate.push(`price_paise = $${index}`);
    values.push(input.price_paise);
    index++;
  }
  if (input.is_available !== undefined) {
    fieldsToUpdate.push(`is_available = $${index}`);
    values.push(input.is_available);
    index++;
  }
  if (input.image_url !== undefined) {
    fieldsToUpdate.push(`image_url = $${index}`);
    values.push(input.image_url);
    index++;
  }
  if (fieldsToUpdate.length === 0) {
    const error = new Error("No fields to update");
    (error as any).statusCode = 400;
    throw error;
  }

  const updateQuery = `
        UPDATE menu_items
        SET ${fieldsToUpdate.join(", ")}, updated_at = NOW()
        WHERE id = $${index}
    `;
  const result = await pool.query(updateQuery, [...values, menuItemId]);

  return result.rows[0];
};

export const deleteMenu = async (
  menuItemId: string
): Promise<{ message: string }> => {
  // 1. Check if menu item exists
  const existingMenuItem = await pool.query(
    `
      SELECT id
      FROM menu_items
      WHERE id = $1
    `,
    [menuItemId]
  );

  if (existingMenuItem.rows.length === 0) {
    const error = new Error("Menu item not found");
    (error as Error & { statusCode?: number }).statusCode = 404;
    throw error;
  }

  // 2. Delete menu item

  const result = await pool.query(
    `
      DELETE FROM menu_items
      WHERE id = $1
    `,
    [menuItemId]
  );

  // 3. Verify deletion
  if (result.rowCount === 0) {
    const error = new Error("Failed to delete menu item");
    (error as Error & { statusCode?: number }).statusCode = 500;
    throw error;
  }

  // 4. Success response
  return {
    message: "Menu item deleted successfully",
  };
};

export const getMenuItemById = async (
  menuItemId: string
): Promise<MenuItem | null> => {
  const result = await pool.query(
    ` SELECT id, restaurant_id, category_id, name, description, price_paise, is_available, image_url, created_at, updated_at
          FROM menu_items
          WHERE id = $1`,
    [menuItemId]
  );

  return result.rows[0] || null;
};


export const getRestaurantMenu = async (
  restaurantId: string
): Promise<RestaurantMenu> => {
  const result = await pool.query<RestaurantMenuItemRow>(
    `
      SELECT
        mi.id,
        mi.name,
        mi.description,
        mi.price_paise,
        mi.is_available,
        mi.image_url,

        c.id AS category_id,
        c.name AS category_name,
        c.display_order AS category_display_order

      FROM menu_items mi

      LEFT JOIN categories c
        ON c.id = mi.category_id

      WHERE mi.restaurant_id = $1
        AND mi.is_available = TRUE

      ORDER BY
        c.display_order NULLS LAST,
        mi.name ASC
    `,
    [restaurantId]
  );

  const categoriesMap = new Map<string, MenuCategory>();

  for (const item of result.rows) {
    // Skip items without a category
    if (!item.category_id || !item.category_name) {
      continue;
    }

    // Create category if it doesn't exist
    if (!categoriesMap.has(item.category_id)) {
      categoriesMap.set(item.category_id, {
        id: item.category_id,
        name: item.category_name,
        items: [],
      });
    }

    // Add item to category
    categoriesMap.get(item.category_id)!.items.push({
      id: item.id,
      name: item.name,
      description: item.description,
      price_paise: item.price_paise,
      is_available: item.is_available,
      image_url: item.image_url
    });
  }

  return {
    restaurantId,
    categories: Array.from(categoriesMap.values()),
  };
};