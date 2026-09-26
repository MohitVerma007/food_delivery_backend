import { z } from "zod";

export const createCategorySchema = z.object({

    name: z
        .string()
        .trim()
        .min(2, "Category name must be at least 2 characters")
        .max(150,"Category name cannot exceed 100 characters"),

    displayOrder: z
        .number()
        .int("Display Order must be an integer")
        .min(0, "Display order cannot be negative")
        .optional()
        .default(0),
})