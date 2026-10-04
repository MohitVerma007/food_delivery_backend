import { z } from 'zod';

export const addCartItemSchema = z.object({
    menuItemId: z.uuid("Invalid menu item ID"),
    quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50"),
});

export const updateCartItemSchema = z.object({
    quantity: z.number().int().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50"),
});

export const cartItemParamsSchema = z.object({
    itemId: z.uuid("Invalid cart item ID ")
});


// Typescript types derived from the Zod schemas
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;   
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CartItemParamInput = z.infer<typeof cartItemParamsSchema>;