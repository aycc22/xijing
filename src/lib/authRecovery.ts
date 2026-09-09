export function hashLooksLikeSupabaseAuth(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw || raw.startsWith('/')) return false
  return (
    raw.includes('access_token=') ||
    raw.includes('refresh_token=') ||
    raw.includes('error_description=') ||
    raw.includes('type=recovery')
  )
}

export function authRedirectPath(search: string, hash: string): '/reset-password' | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const hashBody = hash.startsWith('#') ? hash.slice(1) : hash
  const hashParams = new URLSearchParams(hashBody.includes('=') && !hashBody.startsWith('/') ? hashBody : '')
  const type = params.get('type') || hashParams.get('type')
  if (type === 'recovery' || hashLooksLikeSupabaseAuth(hash)) return '/reset-password'
  return null
}

export function siteRedirectTo(): string {
  const origin = window.location.origin
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  return `${origin}${normalized}`
}
