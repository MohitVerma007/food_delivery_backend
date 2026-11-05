import { createClient } from "redis";
import { env } from "./env.js";

export const redis = createClient({
    url: env.redisUrl,
})

redis.on("error", (err) => console.error("Redis Client Error", err));

export async function connectRedis(){
    if (!redis.isOpen){
        await redis.connect();
    }
}