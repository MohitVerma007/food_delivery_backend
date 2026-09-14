import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {


    console.error(error);

    if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
            error: {
                code: "INVALID_CREDENTIALS",
                message: "Email or password is incorrect"
            }
        });
    }


    if (error.message === "EMAIL_ALREADY_EXISTS"){
        return res.status(409).json({
            error: {
                code: "EMAIL_ALREADY_EXISTS",
                message: "Email already exists"
            }
        })
    }

    return res.status(500).json({
        error: {
            code: "INTERVAL_SERVER_ERROR",
            message: "Something went wrong"
        }
    });

};