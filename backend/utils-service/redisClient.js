/**
 * utils-service/redisClient.js
 *
 * Centralised Redis client (ioredis) shared across all microservices.
 *
 * Key-prefix convention:
 *   audiopro:<namespace>:<identifier>
 *   e.g.  audiopro:user:profile:64a1b2c3d4e5f6a7b8c9d0e1
 *
 * Cache-aside helpers:
 *   getCache(key)           → parsed JSON or null
 *   setCache(key, val, ttl) → stores JSON string with TTL (seconds)
 *   delCache(key)           → evicts a single key
 *   delCacheByPattern(pat)  → evicts all keys matching a glob pattern (SCAN based)
 */

import Redis from "ioredis";

// ── Connection ────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL, {
  // Reconnect with exponential back-off, max 30 s between retries
  retryStrategy: (times) => Math.min(times * 100, 30_000),
  // Silence "MaxListenersExceeded" in larger apps
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on("connect", () =>
  console.log("✅ [redis] Connected to Redis at", REDIS_URL)
);
redis.on("error", (err) =>
  console.error("❌ [redis] Connection error:", err.message)
);
redis.on("reconnecting", (ms) =>
  console.warn(`⚠️  [redis] Reconnecting in ${ms} ms…`)
);

// ── Key-prefix builder ────────────────────────────────────────────────────────

/**
 * Builds a namespaced cache key.
 *
 * @param  {...string} segments  Key segments (joined with ":")
 * @returns {string}             e.g. "audiopro:user:profile:abc123"
 *
 * @example
 *   buildKey("user", "profile", userId)
 *   // → "audiopro:user:profile:64a1b2c3d4e5f6a7b8c9d0e1"
 */
export const buildKey = (...segments) =>
  ["audiopro", ...segments].join(":");

// ── Cache-aside helpers ───────────────────────────────────────────────────────

/**
 * Cache-aside READ: return parsed value or null on miss / error.
 *
 * @param  {string} key
 * @returns {Promise<any|null>}
 */
export const getCache = async (key) => {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[redis] getCache error for key "${key}":`, err.message);
    return null; // degrade gracefully → fall through to DB
  }
};

/**
 * Cache-aside WRITE: store value as JSON with a TTL.
 *
 * @param  {string} key
 * @param  {any}    value   Must be JSON-serialisable
 * @param  {number} [ttl=300]  TTL in seconds (default 5 min)
 * @returns {Promise<void>}
 */
export const setCache = async (key, value, ttl = 300) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch (err) {
    console.error(`[redis] setCache error for key "${key}":`, err.message);
    // Non-fatal: log and continue
  }
};

/**
 * Cache INVALIDATE: delete a single key.
 *
 * @param  {string} key
 * @returns {Promise<void>}
 */
export const delCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`[redis] delCache error for key "${key}":`, err.message);
  }
};

/**
 * Cache INVALIDATE by glob pattern (SCAN-based, safe for production).
 *
 * @param  {string} pattern  e.g. "audiopro:user:profile:*"
 * @returns {Promise<void>}
 */
export const delCacheByPattern = async (pattern) => {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(
          `[redis] Evicted ${keys.length} key(s) matching "${pattern}"`
        );
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error(
      `[redis] delCacheByPattern error for pattern "${pattern}":`,
      err.message
    );
  }
};

// ── TTL constants (seconds) ───────────────────────────────────────────────────
export const TTL = {
  USER_PROFILE: 5 * 60,       //  5 minutes
  USER_SHORT:   60,            //  1 minute  (OTP / volatile data)
  PRODUCT_LIST: 10 * 60,       // 10 minutes
  ORDER:        2 * 60,        //  2 minutes
};

export default redis;
