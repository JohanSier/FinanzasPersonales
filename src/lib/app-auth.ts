import 'server-only'
import { cookies } from 'next/headers'
import { createPayloadRequest, logoutOperation, refreshOperation } from 'payload'
import { getPayloadClient } from '@/lib/payload'

const SESSION = 'app-session'
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  partitioned: true,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

export function createAppAuth(appUserCollection: 'users') {
  async function session() {
    const token = (await cookies()).get(SESSION)?.value
    if (!token) return null
    const payload = await getPayloadClient()
    const headers = new Headers({ Authorization: `JWT ${token}` })
    try {
      const { user } = await payload.auth({ headers })
      return user?.collection === appUserCollection ? { payload, user, headers } : null
    } catch {
      return null
    }
  }
  return {
    session,
    async login(email: string, password: string) {
      const payload = await getPayloadClient()
      const result = await payload.login({
        collection: appUserCollection,
        data: { email, password },
      })
      if (!result.token) throw new Error('No se pudo iniciar sesión.')
      ;(await cookies()).set(SESSION, result.token, cookieOptions)
      return result.user
    },
    async logout() {
      const current = await session()
      if (current) {
        const req = await createPayloadRequest({
          payload: current.payload,
          user: current.user,
          req: { headers: current.headers },
        })
        await logoutOperation({ collection: current.payload.collections[appUserCollection], req })
      }
      ;(await cookies()).set(SESSION, '', { ...cookieOptions, maxAge: 0 })
    },
    async refresh() {
      const current = await session()
      if (!current) return false
      const req = await createPayloadRequest({
        payload: current.payload,
        user: current.user,
        req: { headers: current.headers },
      })
      const result = await refreshOperation({
        collection: current.payload.collections[appUserCollection],
        req,
      })
      ;(await cookies()).set(SESSION, result.refreshedToken, cookieOptions)
      return true
    },
  }
}
export const appAuth = createAppAuth('users')
