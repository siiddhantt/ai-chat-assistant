import { Request, Response, Router } from "express";
import { AppError } from "../../types/index.js";
import { ConversationRepository } from "../persistence/repository.js";

const router = Router();

router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const { visitorId, limit, status, includeConversationId } = req.query;

    if (!visitorId || typeof visitorId !== "string") {
      throw new AppError(400, "Visitor ID is required", "MISSING_VISITOR_ID");
    }

    const conversationRepo = new ConversationRepository();
    const conversations = await conversationRepo.findByVisitorIdAcrossTenants(
      visitorId,
      {
        limit: limit ? parseInt(limit as string, 10) : 5,
        status:
          typeof status === "string" && status !== "all"
            ? (status as any)
            : undefined,
        includeConversationId:
          typeof includeConversationId === "string" && includeConversationId
            ? includeConversationId
            : undefined,
      }
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

router.delete(
  "/conversations/:conversationId",
  async (req: Request, res: Response) => {
    try {
      const { conversationId } = req.params;
      const { visitorId } = req.query;

      if (!visitorId || typeof visitorId !== "string") {
        throw new AppError(400, "Visitor ID is required", "MISSING_VISITOR_ID");
      }

      const conversationRepo = new ConversationRepository();
      const deleted = await conversationRepo.deleteConversationByVisitor(
        conversationId,
        visitorId
      );

      if (!deleted) {
        throw new AppError(
          404,
          "Conversation not found",
          "CONVERSATION_NOT_FOUND"
        );
      }

      res.json({ success: true });
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

export default router;
