import { Request, Response, Router } from "express";

import { AppError, ChatRequest } from "../../types/index.js";
import { ChatService } from "./service.js";

const router = Router();
const chatService = new ChatService();

router.post("/message", async (req: Request, res: Response) => {
  try {
    const body = req.body as ChatRequest;
    const response = await chatService.processMessage(body);

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

router.get("/history/:conversationId", async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const messages = await chatService.getConversationHistory(conversationId);

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
});

router.get("/conversations", async (_req: Request, res: Response) => {
  try {
    const conversations = await chatService.getAllConversations();
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
      await chatService.deleteConversation(conversationId);
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
