import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis.js";

const rateLimitScript = `
  local count = redis.call("INCR", KEYS[1])

  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end

  local ttl = redis.call("TTL", KEYS[1])

  return { count, ttl }
`;

export function rateLimit(
  maxRequests: number,
  windowSeconds: number
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const ip = req.ip ?? "unknown";
      const key = `rate-limit:${req.path}:${ip}`;

      const result = await redis.eval(rateLimitScript, {
        keys: [key],
        arguments: [String(windowSeconds)]
      }) as number[];

      const count = result[0] ?? 0;
      const ttl = result[1];

      res.setHeader("RateLimit-Limit", maxRequests);
      res.setHeader("RateLimit-Remaining", Math.max(0, maxRequests - count));

      if (count > maxRequests) {
        res.setHeader("Retry-After", Math.max(1, ttl ?? 1));

        return res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later."
          }
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiter failed", error);

      // Fail closed for this protected endpoint.
      return res.status(503).json({
        error: {
          code: "RATE_LIMIT_UNAVAILABLE",
          message: "Request protection is temporarily unavailable"
        }
      });
    }
  };
}