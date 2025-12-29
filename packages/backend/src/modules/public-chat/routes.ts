import { Request, Response, Router } from "express";
import { AppError, PublicChatRequest } from "../../types/index.js";
import { PublicChatService } from "./service";

const router = Router();

router.post("/:slug/message", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const body = req.body as PublicChatRequest;

    if (!body.visitorId || typeof body.visitorId !== "string") {
      throw new AppError(400, "Visitor ID is required", "MISSING_VISITOR_ID");
    }

    if (!body.message || typeof body.message !== "string") {
      throw new AppError(400, "Message is required", "MISSING_MESSAGE");
    }

    const service = new PublicChatService();
    const response = await service.processMessage(slug, body);

    res.json(response);
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
  "/:slug/conversations/:conversationId",
  async (req: Request, res: Response) => {
    try {
      const { slug, conversationId } = req.params;
      const { visitorId } = req.query;

      if (!visitorId || typeof visitorId !== "string") {
        throw new AppError(400, "Visitor ID is required", "MISSING_VISITOR_ID");
      }

      const service = new PublicChatService();
      const messages = await service.getConversationHistory(
        slug,
        conversationId,
        visitorId
      );

      res.json({ messages });
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

router.get("/:slug/info", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const service = new PublicChatService();
    const tenantInfo = await service.getTenantPublicInfo(slug);

    res.json(tenantInfo);
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

router.get("/:slug/conversations", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { visitorId } = req.query;

    if (!visitorId || typeof visitorId !== "string") {
      throw new AppError(400, "Visitor ID is required", "MISSING_VISITOR_ID");
    }

    const service = new PublicChatService();
    const conversations = await service.getVisitorConversations(
      slug,
      visitorId
    );

    res.json({ conversations });
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
