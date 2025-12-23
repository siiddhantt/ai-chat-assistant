import dotenv from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    name: process.env.DATABASE_NAME || "chat_agent",
    user: process.env.DATABASE_USER || "user",
    password: process.env.DATABASE_PASSWORD || "password",
  },

  llm: {
    provider: (process.env.LLM_PROVIDER || "openai") as "openai" | "anthropic",
    apiKey: process.env.LLM_API_KEY,
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },
};

export function validateConfig(): void {
  if (!config.llm.apiKey) {
    throw new Error("LLM_API_KEY environment variable is required");
  }

  if (!config.database.url && !config.database.host) {
    throw new Error("DATABASE_URL or DATABASE_HOST is required");
  }
}
