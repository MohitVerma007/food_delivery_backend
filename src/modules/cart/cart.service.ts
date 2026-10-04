import { pool } from '../../config/db.js';
import type { AddCartItemInput, UpdateCartItemInput, CartItemParamInput } from './cart.schema.js';

export const addCartItem = async (userId: string, input: AddCartItemInput) => {
    const { menuItemId, quantity } = input;

    // Step 1: Check if the menu item exists and is active
    const menuItemResult = await pool.query(
        `SELECT id FROM menu_items WHERE id = $1 AND is_active = true`,
        [menuItemId]
    );

    const menuItem = menuItemResult.rows[0];

    if (!menuItem) {
        const error = new Error('Menu item not found or is inactive');
        (error as Error & { statusCode?: number }).statusCode = 404;
        throw error;
    }
    if (!menuItem.is_available) {
        const error = new Error('Menu item is not available');
        (error as Error & { statusCode?: number }).statusCode = 400;
        throw error;
    }

    // Step 2: Get Existing User Cart
    const cartResult = await pool.query(
        `SELECT id, restaurant_id FROM carts WHERE user_id = $1`,
        [userId]
    );

    let cart = cartResult.rows[0];


    // Step 3: If no cart exists, create a new cart OR validate single restaurant constraint

    if(!cart){
        const newCart = await pool.query(
            `INSERT INTO carts ( user_id, restaurant_id)
            VALUES ($1, $2)
            RETURNING id, restaurant_id
            `,
            [userId, menuItem.restaurant_id]
        );
        cart = newCart.rows[0];
    } else if ( cart.restaurant_id !== menuItem.restaurant_id){
        throw new Error("DIFFERENT_RESTAURANT_CART");
    }


    // Step 4: Atomic Upsert Item (ON CONFLICT INCREMENT quantity)

    const itemResult = await pool.query(
        `
        INSERT INTO cart_items (cart_id, menu_item_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (cart_id, menu_item_id)
        DO UPDATE SET
            quantity = cart_items.quantity + EXCLUDED.quantity
            updated_at = NOW()
        RETURNING id, cart_id, menu_item_id, quantity, updated_at
        `,
        [cart.id, menuItemId, quantity]
    );

    return itemResult.rows[0];

}


// 2. Get User Cart with Aggregated Total

export const getCart = async (userId: string) => {
    const result = await pool.query(
        `
        SELECT
            c.id AS cart_id,
            r.id AS restaurant_id,
            r.name AS restaurant_name,
            ci.id AS cart_item_id,
            ci.quantity,
            mi.id AS menu_item_id,
            mi.name AS menu_item_name,
            mi.price_paise,
            mi.is_available
        FROM carts c
        JOIN restaurants r ON r.id = c.restaurant_id
        LEFT JOIN cart_items ci ON ci.cart_id = c.id
        LEFT JOIN menu_items mi ON mi.id = ci.menu_item_id
        WHERE c.user_id = $1
        ORDER BY ci.created_at ASC            
         `,
         [userId]
    );

    // If cart not exist
    if( result.rows.length === 0) {
        return {
            cartId: null,
            Restaurant: null,
            items: [],
            subtotalPaise: 0
        };
    }


    const rows = result.rows;

    // Cart Exist but empty (LEFT JOIN returns cart details with NULL item fields)

    if(!rows[0].cart_item_id) {
        return {
            cartId: rows[0].cart_id,
            restaurant: {
                id: rows[0].restaurant_id,
                name: rows[0].restaurant_name,
            },
            items: [],
            subtotalPaise: 0,
        };
    }

    let subtotalPaise = 0;

    const items = rows.map((row) => {
        const itemTotalPaise = row.price_paise * row.quantity;
        subtotalPaise += itemTotalPaise;

        return {
            id:row.cart_item_id,
            menuItemId: row.menu_item_id,
            name: row.menu_item_name,
            quantity: row.quantity,
            unitPricePaise: row.price_paise,
            totalPaise: itemTotalPaise,
            isAvailable: row.is_available,
        };
    });


    return {
        cartId: rows[0].cart_id,
        restaurant: {
            id: rows[0].restaurant_id,
            name: rows[0].restaurant_name,
        },
        items,
        subtotalPaise,
    };
}


// 3. Update Cart Item Quantity
export const updateCartItemQuantity = async (
    userId: string,
    itemId: string,
    input: UpdateCartItemInput
) => {
    const result = await pool.query(
        `
        UPDATE cart_items
        SET quantity =$1, updated_at = NOW()
        WHERE id = $2
        AND cart_id = (SELECT id FROM carts WHERE user_id = $3)
        RETURNING id, cart_id, menu_item_id, quantity, updated_at
        `,
        [input.quantity, itemId, userId]
    );

    if ( result.rows.length === 0){
        throw new Error("CART_ITEM_NOT_FOUND");
    }

    return result.rows[0];
}


// 4. Remove SIngle Item from Cart
export const removeCartItem = async (
    userId: string, ItemId: string
) => {
    const result = await pool.query(
        `
        DELETE FROM cart_items
        WHERE id = $1
        AND cart_id = (SELECT id FROM carts WHERE user_id = $2)
        RETURNING id
        `,
        [ItemId, userId]
    );

    if ( result.rows.length === 0){
        throw new Error("CART_ITEM_NOT_FOUND");
    }

    return {
        message: "Item removed successfully"
    };

};

// 5. Clear Entire Cart
export const clearCart = async(
    userId: string
) => {
    await pool.query(
        `
        DELETE FROM carts
        WHErE user_id = $1
        `,
        [userId]
    );

    return { message: "Cart cleared successfully !"};
}