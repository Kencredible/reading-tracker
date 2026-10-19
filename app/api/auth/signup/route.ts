import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { sql, initDb } from '@/lib/db'
import { createSession } from '@/lib/session'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    await initDb()
    const body = await req.json()
    const { email, password } = signupSchema.parse(body)

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const result = await sql`
      INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash}) RETURNING id
    `
    const userId = result.rows[0].id
    await createSession(userId, email)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Signup error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
