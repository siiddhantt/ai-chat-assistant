import { Request, Response, Router } from "express";

import {
  AppError,
  AuthPayload,
  ConversationFilters,
  ConversationStatus,
} from "../../types/index.js";
import { authMiddleware } from "../auth/middleware.js";
import { OwnerService } from "./service";

const router = Router();

router.use(authMiddleware);

function requireOwner(auth: AuthPayload): void {
  if (auth.role !== "owner" && auth.role !== "admin") {
    throw new AppError(403, "Owner access required", "FORBIDDEN");
  }
  if (!auth.tenantId) {
    throw new AppError(403, "No tenant associated", "NO_TENANT");
  }
}

router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload;
    requireOwner(auth);

    const filters: ConversationFilters = {};

    if (req.query.status && typeof req.query.status === "string") {
      if (!["active", "archived", "resolved"].includes(req.query.status)) {
        throw new AppError(400, "Invalid status filter", "INVALID_STATUS");
      }
      filters.status = req.query.status as ConversationStatus;
    }

    if (req.query.isLead !== undefined) {
      filters.isLead = req.query.isLead === "true";
    }

    if (req.query.limit) {
      filters.limit = Math.min(
        parseInt(req.query.limit as string, 10) || 50,
        100
      );
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10) || 0;
    }

    const service = new OwnerService();
    const result = await service.getConversations(auth.tenantId!, filters);

    res.json(result);
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
});

router.get(
  "/conversations/:conversationId",
  async (req: Request, res: Response) => {
    try {
      const auth = req.auth as AuthPayload;
      requireOwner(auth);
      const { conversationId } = req.params;

      const service = new OwnerService();
      const conversation = await service.getConversationDetails(
        auth.tenantId!,
        conversationId
      );

      res.json(conversation);
    } catch (err) {
      const error = err as AppError;
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      } else {
        console.error("Unexpected error:", error);
        res.status(500).json({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    }
  }
);

router.patch(
  "/conversations/:conversationId/status",
  async (req: Request, res: Response) => {
    try {
      const auth = req.auth as AuthPayload;
      requireOwner(auth);
      const { conversationId } = req.params;
      const { status } = req.body;

      if (!status || !["active", "archived", "resolved"].includes(status)) {
        throw new AppError(400, "Invalid status", "INVALID_STATUS");
      }

      const service = new OwnerService();
      const conversation = await service.updateConversationStatus(
        auth.tenantId!,
        conversationId,
        status as ConversationStatus
      );

      res.json(conversation);
    } catch (err) {
      const error = err as AppError;
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      } else {
        console.error("Unexpected error:", error);
        res.status(500).json({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    }
  }
);

router.post(
  "/conversations/:conversationId/convert",
  async (req: Request, res: Response) => {
    try {
      const auth = req.auth as AuthPayload;
      requireOwner(auth);
      const { conversationId } = req.params;

      const service = new OwnerService();
      const conversation = await service.convertLead(
        auth.tenantId!,
        conversationId
      );

      res.json(conversation);
    } catch (err) {
      const error = err as AppError;
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
        });
      } else {
        console.error("Unexpected error:", error);
        res.status(500).json({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        });
      }
    }
  }
);

router.get("/leads", async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload;
    requireOwner(auth);

    const filters: ConversationFilters = {
      isLead: true,
      status: "active",
    };

    if (req.query.limit) {
      filters.limit = Math.min(
        parseInt(req.query.limit as string, 10) || 50,
        100
      );
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string, 10) || 0;
    }

    const service = new OwnerService();
    const result = await service.getConversations(auth.tenantId!, filters);

    res.json(result);
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
});

router.get("/dashboard/stats", async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload;
    requireOwner(auth);

    const service = new OwnerService();
    const stats = await service.getDashboardStats(auth.tenantId!);

    res.json(stats);
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    } else {
      console.error("Unexpected error:", error);
      res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      });
    }
  }
});

export default router;
