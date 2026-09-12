import {z} from 'zod';

export const registerSchema = z.object({
    name: z
        .string()
        .min(2)
        .max(100),

    email: z
        .email(),

    password: z
        .string()
        .min(8)
        .max(100)

});

export const getUsersQuerySchema = z.object({
    page: z.string().optional().transform((val)=>(val ? parseInt(val, 10) : 1 )),
    limit: z.string().optional().transform((val)=>(val ? parseInt(val, 10) : 10 )),

});

