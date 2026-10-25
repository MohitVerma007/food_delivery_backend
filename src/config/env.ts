import dotenv from "dotenv";

dotenv.config();

export const env = {
    port: Number(process.env.PORT || 3000),
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    redisUrl: process.env.REDIS_URL!,
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    razorpayKey: process.env.RAZORPAY_KEY_ID,
    razorpaySecret: process.env.RAZORPAY_KEY_SECRET,
}