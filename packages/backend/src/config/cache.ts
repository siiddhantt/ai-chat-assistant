export interface CacheConfig {
  enabled: boolean;
  url: string;
  ttl: number;
}

function parseCacheConfig(): CacheConfig {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const ttl = parseInt(process.env.CACHE_TTL || "3600");

  return {
    enabled: process.env.REDIS_ENABLED !== "false",
    url: redisUrl,
    ttl,
  };
}

export const cacheConfig = parseCacheConfig();
