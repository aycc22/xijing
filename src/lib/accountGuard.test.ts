import { describe, expect, it } from 'vitest'
import {
  canChangeAdminRole,
  canFreezeUser,
  isAccountFrozen,
  lastActiveAdminCount,
} from './accountGuard'

const users = [
  { id: 'a', role: 'admin', status: 'active' },
  { id: 'b', role: 'learner', status: 'active' },
  { id: 'c', role: 'admin', status: 'frozen' },
]

describe('account freeze', () => {
  it('detects frozen status', () => {
    expect(isAccountFrozen('frozen')).toBe(true)
    expect(isAccountFrozen('active')).toBe(false)
    expect(isAccountFrozen(null)).toBe(false)
  })
})

describe('last admin protection', () => {
  it('counts only active admins', () => {
    expect(lastActiveAdminCount(users)).toBe(1)
  })

  it('blocks demoting the last active admin', () => {
    expect(canChangeAdminRole(users, 'a', 'learner')).toBe(false)
    expect(canChangeAdminRole(users, 'b', 'admin')).toBe(true)
  })

  it('allows demotion when another active admin remains', () => {
    const many = [...users, { id: 'd', role: 'admin', status: 'active' }]
    expect(canChangeAdminRole(many, 'a', 'uploader')).toBe(true)
  })

  it('blocks freezing the last active admin', () => {
    expect(canFreezeUser(users, 'a')).toBe(false)
    expect(canFreezeUser(users, 'b')).toBe(true)
  })
})
