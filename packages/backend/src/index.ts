import express from "express";

import { closeRedis, getRedisClient } from "./config/cache.js";
import { closeDb } from "./config/database.js";
import { config, validateConfig } from "./config/env.js";
import authRoutes from "./modules/auth/routes.js";
import chatRoutes from "./modules/chat/routes.js";
import ownerRoutes from "./modules/owner/routes.js";
import publicChatRoutes from "./modules/public-chat/routes.js";
import visitorRoutes from "./modules/visitor/routes.js";
import { initializeTools } from "./modules/tools/index.js";

validateConfig();

getRedisClient();

initializeTools();

const app = express();

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

app.use((req, res, next) => {
  const allowedOrigins = config.cors.origin.split(",").map((o) => o.trim());
  const origin = req.headers.origin;

  if (
    !origin ||
    allowedOrigins.includes(origin) ||
    allowedOrigins.includes("*")
  ) {
    res.header("Access-Control-Allow-Origin", origin || allowedOrigins[0]);
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", publicChatRoutes);
app.use("/api/internal/chat", chatRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/visitor", visitorRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    code: "NOT_FOUND",
  });
});

const server = app.listen(config.port, () => {
  console.log(`✓ Server running on http://localhost:${config.port}`);
  console.log(`✓ Environment: ${config.nodeEnv}`);
  console.log(`✓ LLM Provider: ${config.llm.provider}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(async () => {
    await closeDb();
    await closeRedis();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(async () => {
    await closeDb();
    await closeRedis();
    process.exit(0);
  });
});

export default app;
