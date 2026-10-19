import { jwtVerify } from 'jose'

export interface SessionPayload {
  userId: number
  email: string
  expiresAt: Date
}

export async function decryptEdge(token: string): Promise<SessionPayload | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
