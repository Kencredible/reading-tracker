import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql, fetchCoverUrl } from '@/lib/db'
import { getSession } from '@/lib/session'

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  status: z.enum(['want', 'reading', 'read']).optional(),
  genre: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const updates = patchSchema.parse(body)

    // Fetch current row first
    const current = await sql`
      SELECT * FROM books WHERE id = ${id} AND user_id = ${session.userId}
    `
    if (current.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const row = current.rows[0]

    const title = updates.title ?? row.title
    const author = updates.author ?? row.author
    const status = updates.status ?? row.status
    const genre = 'genre' in updates ? updates.genre : row.genre
    const rating = 'rating' in updates ? updates.rating : row.rating
    const notes = 'notes' in updates ? updates.notes : row.notes
    const start_date = 'start_date' in updates ? updates.start_date : row.start_date
    const end_date = 'end_date' in updates ? updates.end_date : row.end_date

    // Re-fetch cover if title or author changed
    let coverUrl = row.cover_url
    if (updates.title !== undefined || updates.author !== undefined) {
      const newCover = await fetchCoverUrl(title, author)
      if (newCover) coverUrl = newCover
    }

    const result = await sql`
      UPDATE books SET
        title = ${title},
        author = ${author},
        status = ${status},
        genre = ${genre ?? null},
        rating = ${rating ?? null},
        notes = ${notes ?? null},
        start_date = ${start_date ?? null},
        end_date = ${end_date ?? null},
        cover_url = ${coverUrl}
      WHERE id = ${id} AND user_id = ${session.userId}
      RETURNING *
    `
    return NextResponse.json(result.rows[0])
  } catch (err) {
    console.error('PATCH /api/books/[id] error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await sql`DELETE FROM books WHERE id = ${id} AND user_id = ${session.userId}`
  return NextResponse.json({ ok: true })
}
