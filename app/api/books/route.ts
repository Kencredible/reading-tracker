import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, initDb, fetchCoverUrl } from '@/lib/db'
import { getSession } from '@/lib/session'

const bookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  status: z.enum(['want', 'reading', 'read']),
  genre: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await initDb()
  const result = await sql`
    SELECT * FROM books
    WHERE user_id = ${session.userId}
    ORDER BY
      CASE WHEN status = 'read' THEN start_date::text ELSE NULL END DESC NULLS LAST,
      created_at DESC
  `
  return NextResponse.json(result.rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await initDb()
    const body = await req.json()
    const data = bookSchema.parse(body)

    const coverUrl = await fetchCoverUrl(data.title, data.author)

    const result = await sql`
      INSERT INTO books (user_id, title, author, status, genre, rating, notes, start_date, end_date, cover_url)
      VALUES (
        ${session.userId},
        ${data.title},
        ${data.author},
        ${data.status},
        ${data.genre ?? null},
        ${data.rating ?? null},
        ${data.notes ?? null},
        ${data.start_date ?? null},
        ${data.end_date ?? null},
        ${coverUrl}
      )
      RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('POST /api/books error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
