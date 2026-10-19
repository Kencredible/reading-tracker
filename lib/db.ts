import { sql } from '@vercel/postgres'

export { sql }

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'want',
      genre TEXT,
      rating INTEGER,
      notes TEXT,
      start_date DATE,
      end_date DATE,
      cover_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `
  // Migration: add cover_url if it doesn't exist
  await sql`ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_url TEXT`
}

export async function fetchCoverUrl(title: string, author: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`intitle:${title} inauthor:${author}`)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&fields=items(volumeInfo/imageLinks)`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const imageLinks = data?.items?.[0]?.volumeInfo?.imageLinks
    if (!imageLinks) return null

    const url = imageLinks.medium || imageLinks.small || imageLinks.thumbnail
    if (!url) return null

    // Strip the zoom/edge curl params and force HTTPS
    return url
      .replace(/&edge=curl/g, '')
      .replace(/^http:/, 'https:')
  } catch {
    return null
  }
}
