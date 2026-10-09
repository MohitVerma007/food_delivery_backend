import { z } from "zod";

export const createOrderSchema = z.object({
  address: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "Delivery address is required"
          : "Address must be a string",
    })
    .trim()
    .min(5, "Address must be at least 5 characters long"),

  paymentMethod: z.enum(["ONLINE", "COD"], {
    error: (issue) =>
      issue.input === undefined
        ? "Payment method is required"
        : "Payment method must be either ONLINE or COD",
  }),

  notes: z
    .string({
      error: "Notes must be a string",
    })
    .trim()
    .max(250, "Notes cannot exceed 250 characters")
    .optional(),
});

export type CreateOrderInputType = z.infer<typeof createOrderSchema>;