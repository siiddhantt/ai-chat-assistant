import Redis from "ioredis";

export interface CacheConfig {
  enabled: boolean;
  url: string;
  ttl: number;
}

function parseCacheConfig(): CacheConfig {
  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379", 10);
  const ttl = parseInt(process.env.CACHE_TTL || "300", 10); // 5 minutes default

  return {
    enabled: process.env.REDIS_ENABLED !== "false",
    url: `redis://${host}:${port}`,
    ttl,
  };
}

export const cacheConfig = parseCacheConfig();

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient && cacheConfig.enabled) {
    redisClient = new Redis(cacheConfig.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      lazyConnect: false,
      enableReadyCheck: true,
      enableOfflineQueue: true,
    });

    redisClient.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    redisClient.on("connect", () => {
      console.log("✓ Redis connected");
    });

    redisClient.on("close", () => {
      console.warn("Redis connection closed");
    });
  }

  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
