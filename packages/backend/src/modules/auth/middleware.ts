import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError, AuthPayload } from "../../types/index.js";
import { config } from "../../config/env.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    }

    const token = authHeader.substring(7);

    if (!config.jwtSecret) {
      throw new AppError(500, "JWT secret not configured", "CONFIG_ERROR");
    }

    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload;

    if (!payload.userId || !payload.tenantId) {
      throw new AppError(401, "Invalid token payload", "INVALID_TOKEN");
    }

    req.auth = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: "Invalid token",
        code: "INVALID_TOKEN",
      });
      return;
    }

    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
      return;
    }

    console.error("Auth middleware error:", err);
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
}
