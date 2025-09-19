/**
 * Pagination utility for MongoDB queries
 * @param {Object} query - Mongoose query object
 * @param {Object} options - Pagination options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Items per page
 * @param {Object} options.sort - Sort object
 * @returns {Promise<Object>} - Paginated result with metadata
 */
export async function paginate(query, options = {}) {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 }
  } = options;

  const skip = (page - 1) * limit;
  
  // Execute queries in parallel
  const [data, totalCount] = await Promise.all([
    query.skip(skip).limit(limit).sort(sort),
    query.model.countDocuments(query.getQuery())
  ]);

  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
}

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query object
 * @returns {Object} - Parsed pagination options
 */
export function parsePaginationParams(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  
  // Parse sort parameter (e.g., "createdAt:desc" or "name:asc")
  let sort = { createdAt: -1 };
  if (query.sort) {
    const [field, order] = query.sort.split(':');
    sort = { [field]: order === 'asc' ? 1 : -1 };
  }

  return { page, limit, sort };
}
