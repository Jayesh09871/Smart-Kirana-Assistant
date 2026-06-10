import mongoose from 'mongoose';
import { setUseMemoryStore } from './store';

const MONGODB_URI = process.env.MONGODB_URI!;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastFailTime: number;
  failCount: number;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const RETRY_COOLDOWN_MS = 30_000; // Retry after 30 seconds
const MAX_FAIL_COUNT = 5; // Give up after 5 consecutive failures (but still retry after cooldown)

const cached: MongooseCache = global.mongoose || { conn: null, promise: null, lastFailTime: 0, failCount: 0 };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect(): Promise<typeof mongoose> {
  // If already connected, return immediately
  if (cached.conn) {
    return cached.conn;
  }

  // If we've failed recently and haven't waited long enough, throw early
  const now = Date.now();
  if (cached.failCount >= MAX_FAIL_COUNT && now - cached.lastFailTime < RETRY_COOLDOWN_MS) {
    throw new Error(`MongoDB unavailable, retrying in ${Math.ceil((RETRY_COOLDOWN_MS - (now - cached.lastFailTime)) / 1000)}s`);
  }

  // If previous promise was rejected, clear it for retry
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
    cached.failCount = 0;
    cached.lastFailTime = 0;
    setUseMemoryStore(false);
    console.log('[DB] MongoDB connected successfully');
  } catch (e) {
    cached.promise = null;
    cached.failCount += 1;
    cached.lastFailTime = Date.now();
    setUseMemoryStore(true);
    console.warn(`[DB] MongoDB connection failed (attempt ${cached.failCount}), using in-memory fallback:`, (e as Error).message);
    throw e;
  }

  return cached.conn;
}

export function isDbConnected(): boolean {
  return !!cached.conn && cached.failCount === 0;
}

export function resetDbConnection(): void {
  cached.conn = null;
  cached.promise = null;
  cached.failCount = 0;
  cached.lastFailTime = 0;
}

export default dbConnect;
