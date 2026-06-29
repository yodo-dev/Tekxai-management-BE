/**
 * Reads `page` and `limit` from an Express query object and returns
 * { skip, take } suitable for Prisma findMany.
 *
 * Defaults: page=1, limit=50. Hard cap: limit=200.
 */
export function paginate(query = {}) {
  const page  = Math.max(1, parseInt(query.page,  10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}
