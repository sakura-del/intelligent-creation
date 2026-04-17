export function safeJSONParse(str, fallback = null) {
  if (!str) return fallback
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

export function safeJSONStringify(val) {
  if (val === undefined || val === null) return null
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function unescapeLiteralChars(str) {
  if (!str || typeof str !== 'string') return str
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
}

export async function paginateQuery(db, { baseQuery, countQuery, params = [], page = 1, limit = 20 }) {
  const safePage = Math.max(1, parseInt(page) || 1)
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit) || 20))
  const offset = (safePage - 1) * safeLimit

  const [countResult] = await db.query(countQuery, params)
  const total = countResult?.total || 0

  const data = await db.query(
    `${baseQuery} LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  )

  return {
    list: Array.isArray(data) ? data : (data || []),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  }
}
