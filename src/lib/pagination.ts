export const DEFAULT_PAGE_SIZE = 20

export function pageRange(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, Math.floor(page) || 1)
  const size = Math.max(1, Math.floor(pageSize) || DEFAULT_PAGE_SIZE)
  const from = (safePage - 1) * size
  return { from, to: from + size - 1, page: safePage, pageSize: size }
}

export function totalPages(count: number, pageSize = DEFAULT_PAGE_SIZE): number {
  const size = Math.max(1, pageSize)
  if (count <= 0) return 1
  return Math.max(1, Math.ceil(count / size))
}
