import type { ErrorRequestHandler } from "express";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    req,
    res,
    _next
) => {
    // 1. Winston logger se structured log print karo (request ID ke sath)
    logger.error("Request failed", {
        requestId: res.locals.requestId,
        method: req.method,
        path: req.path,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
    });

    // 2. Agar known operational error hai (AppError instance)
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                requestId: res.locals.requestId,
            },
        });
    }

    // 3. Agar purane code ki tarah seedhe error messages throw ho rahe hain (jaise "INVALID_CREDENTIALS")
    if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
            success: false,
            error: {
                code: "INVALID_CREDENTIALS",
                message: "Email or password is incorrect",
                requestId: res.locals.requestId,
            },
        });
    }

    if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
            success: false,
            error: {
                code: "EMAIL_ALREADY_EXISTS",
                message: "Email already exists",
                requestId: res.locals.requestId,
            },
        });
    }

    // 4. Default / Unexpected Errors (500 Internal Server Error)
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong",
            requestId: res.locals.requestId,
        },
    });
};

























// import type { Request, Response, NextFunction } from "express";

// export const errorHandler = (
//     error: any,
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {


//     console.error(error);

//     if (error.message === "INVALID_CREDENTIALS") {
//         return res.status(401).json({
//             error: {
//                 code: "INVALID_CREDENTIALS",
//                 message: "Email or password is incorrect"
//             }
//         });
//     }


//     if (error.message === "EMAIL_ALREADY_EXISTS"){
//         return res.status(409).json({
//             error: {
//                 code: "EMAIL_ALREADY_EXISTS",
//                 message: "Email already exists"
//             }
//         })
//     }

//     if (typeof error.statusCode === "number") {
//         return res.status(error.statusCode).json({
//             error: {
//                 code: error.message,
//                 message: error.message,
//             }
//         });
//     }

//     return res.status(500).json({
//         error: {
//             code: "INTERVAL_SERVER_ERROR",
//             message: "Something went wrong"
//         }
//     });

// };