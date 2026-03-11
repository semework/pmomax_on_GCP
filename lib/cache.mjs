// lib/cache.mjs - LRU cache for request caching
import { LRUCache } from 'lru-cache';
import logger from './logger.mjs';

const cache = new LRUCache({
  max: 20, // Last 20 queries
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: true,
  allowStale: false
});

export function getCached(key) {
  const value = cache.get(key);
  if (value) {
    logger.debug('Cache hit', { key: key.substring(0, 50) });
  }
  return value;
}

export function setCached(key, value) {
  cache.set(key, value);
  logger.debug('Cache set', { key: key.substring(0, 50), size: cache.size });
}

export function clearCache() {
  cache.clear();
  logger.info('Cache cleared');
}

export default cache;
