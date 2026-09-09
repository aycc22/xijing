export type AccountStatus = 'active' | 'frozen'

export function isAccountFrozen(status: string | null | undefined): boolean {
  return status === 'frozen'
}

export const FROZEN_ACCOUNT_MESSAGE = '账号已冻结，请联系管理员'

export function lastActiveAdminCount(
  users: { id: string; role: string; status?: string | null }[],
): number {
  return users.filter((u) => u.role === 'admin' && !isAccountFrozen(u.status)).length
}

export function canChangeAdminRole(
  users: { id: string; role: string; status?: string | null }[],
  userId: string,
  nextRole: string,
): boolean {
  const target = users.find((u) => u.id === userId)
  if (!target) return false
  if (target.role !== 'admin') return true
  if (nextRole === 'admin') return true
  return lastActiveAdminCount(users) > 1
}

export function canFreezeUser(
  users: { id: string; role: string; status?: string | null }[],
  userId: string,
): boolean {
  const target = users.find((u) => u.id === userId)
  if (!target) return false
  if (target.role !== 'admin') return true
  return lastActiveAdminCount(users) > 1
}
