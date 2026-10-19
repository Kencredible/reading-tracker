import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sql, initDb } from '@/lib/db'
import { createSession } from '@/lib/session'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    const result = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    await createSession(user.id, email)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Login error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
