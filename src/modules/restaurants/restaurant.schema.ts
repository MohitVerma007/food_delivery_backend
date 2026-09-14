import { z } from "zod";

export const createRestaurantSchema = z.object({
    
    name: z.string().min(2).max(150),

    description: z.string().max(1000).optional(),

    address: z.string().min(5).max(500),

    latitude: z.number().min(-90).max(90),

    longitude: z.number().min(-180).max(180)
});