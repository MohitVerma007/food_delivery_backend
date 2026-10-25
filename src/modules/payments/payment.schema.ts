import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.uuid("Invalid order ID"),
});