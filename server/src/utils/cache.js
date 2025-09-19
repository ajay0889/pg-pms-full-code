/**
 * Simple in-memory cache implementation
 * For production, consider using Redis or similar
 */
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttl.get(key);
    if (expiry && Date.now() > expiry) {
      // Expired, remove from cache
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * Get or set pattern - if key exists return it, otherwise execute function and cache result
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {number} ttlSeconds - TTL in seconds
   * @returns {Promise<any>} - Cached or computed value
   */
  async getOrSet(key, fn, ttlSeconds = 300) {
    let value = this.get(key);
    
    if (value === null) {
      value = await fn();
      this.set(key, value, ttlSeconds);
    }
    
    return value;
  }

  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match (simple string contains)
   */
  invalidatePattern(pattern) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.ttl.delete(key);
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiry] of this.ttl.entries()) {
      if (expiry && now > expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.ttl.delete(key);
    });
    
    return expiredKeys.length;
  }
}

// Create singleton instance
const cache = new SimpleCache();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

export default cache;
