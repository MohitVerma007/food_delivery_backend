import { z } from "zod";

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),
  description: z.string().trim().max(1000).optional(),
  
  // Enforces positive integer (e.g., 24900 for ₹249.00)
  pricePaise: z.number().int("Price in paise must be an integer").min(0, "Price cannot be negative"),
  
  // UUID validation for cross-referencing categories
  categoryId: z.uuid("Invalid Category ID").optional(),
  
  isAvailable: z.boolean().optional().default(true),
  imageUrl: z.url("Invalid image URL").optional()
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;