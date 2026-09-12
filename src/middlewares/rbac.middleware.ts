import type { NextFunction, Request, Response } from "express"
import type { AuthRequest } from "./auth.middleware.js"
import { error } from "node:console"

export const authorize = (...roles: string[]) => {
    return (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) => {

        if (!req.user) {
            return res.status(401).json({
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication Required"
                }
            })
        }

        if ( !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: {
                    code: "FORBIDDEN",
                    message: "You don't have permission"
                }
            })
        }

        next();
    }
}