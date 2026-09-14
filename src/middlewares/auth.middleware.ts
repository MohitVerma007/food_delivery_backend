import type { Request, Response, NextFunction } from 'express'; 
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const authenticate = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const header = req.headers.authorization;

    if(!header?.startsWith("Bearer ")) {
        return res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Authenticated required"
            }
        });
    }

    const token = header.substring(7);

    try {
        const payload = jwt.verify(
            token,
            env.jwtSecret
        ) as {
            sub: string;
            role: string;
        };

         req.user = {
            id: payload.sub,
            role: payload.role
         }

         next()


    } catch (error) {

        return res.status(401).json({
        error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token"
        }
    });

    }



};