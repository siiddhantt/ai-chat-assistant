import { getRedisClient } from "../../config/cache.js";

export class RedisService {
  private redis = getRedisClient();

  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `ratelimit:${key}`;

    try {
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);
      const count = await this.redis.zcard(redisKey);

      if (count >= limit) {
        return false;
      }

      await this.redis.zadd(redisKey, now, `${now}`);
      await this.redis.expire(redisKey, Math.ceil(windowMs / 1000));

      return true;
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return true;
    }
  }
}
