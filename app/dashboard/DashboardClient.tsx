'use client'
import { useState, useEffect, useCallback } from 'react'

interface Book {
  id: number
  title: string
  author: string
  status: 'want' | 'reading' | 'read'
  genre: string | null
  rating: number | null
  notes: string | null
  start_date: string | null
  end_date: string | null
  cover_url: string | null
  created_at: string
}

type Tab = 'all' | 'reading' | 'read' | 'want' | 'hof'

const GENRES = ['Fiction', 'Non-Fiction', 'Fantasy', 'Sci-Fi', 'Mystery', 'Biography', 'History', 'Self-Help', 'Romance', 'Thriller', 'Other']
const SPINE_COLORS = ['#8b5e3c','#3d6b8b','#5a8b3d','#8b3d6b','#6b3d8b','#8b7a3d','#3d8b7a','#8b4a3d']

function spineColor(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffff
  return SPINE_COLORS[h % SPINE_COLORS.length]
}

function readingDays(book: Book): number | null {
  if (!book.start_date || !book.end_date) return null
  const diff = new Date(book.end_date).getTime() - new Date(book.start_date).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

function Stars({ rating, onChange }: { rating: number | null; onChange?: (r: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <span
          key={n}
          onClick={() => onChange?.(n)}
          style={{ cursor: onChange ? 'pointer' : 'default', fontSize: 16, color: n <= (rating ?? 0) ? '#f5a623' : '#ddd' }}
        >★</span>
      ))}
    </div>
  )
}

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [books, setBooks] = useState<Book[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [suggestion, setSuggestion] = useState<Book | null>(null)
  const [yearFilter, setYearFilter] = useState<number | null>(null)

  const [form, setForm] = useState({
    title: '', author: '', status: 'want' as Book['status'],
    genre: '', rating: 0, notes: '', start_date: '', end_date: '',
  })

  const fetchBooks = useCallback(async () => {
    const res = await fetch('/api/books')
    if (res.ok) setBooks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  function resetForm() {
    setForm({ title: '', author: '', status: 'want', genre: '', rating: 0, notes: '', start_date: '', end_date: '' })
  }

  function openAdd() {
    resetForm()
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(book: Book) {
    setForm({
      title: book.title, author: book.author, status: book.status,
      genre: book.genre ?? '', rating: book.rating ?? 0, notes: book.notes ?? '',
      start_date: book.start_date?.slice(0,10) ?? '', end_date: book.end_date?.slice(0,10) ?? '',
    })
    setEditingId(book.id)
    setShowForm(false)
  }

  function cancelEdit() { setEditingId(null) }

  async function saveBook() {
    const payload = {
      title: form.title, author: form.author, status: form.status,
      genre: form.genre || null, rating: form.rating || null, notes: form.notes || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
    }
    if (editingId) {
      const res = await fetch(`/api/books/${editingId}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if (res.ok) { const updated = await res.json(); setBooks(prev => prev.map(b => b.id === editingId ? updated : b)); setEditingId(null) }
    } else {
      const res = await fetch('/api/books', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      if (res.ok) { const created = await res.json(); setBooks(prev => [created, ...prev]); setShowForm(false); resetForm() }
    }
  }

  async function deleteBook(id: number) {
    if (!confirm('Delete this book?')) return
    await fetch(`/api/books/${id}`, { method: 'DELETE' })
    setBooks(prev => prev.filter(b => b.id !== id))
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  function pickSuggestion(skip?: Book) {
    const pool = books.filter(b => b.status === 'want' && b.id !== skip?.id)
    if (!pool.length) { setSuggestion(null); return }
    setSuggestion(pool[Math.floor(Math.random() * pool.length)])
  }

  async function startReading(book: Book) {
    const today = new Date().toISOString().slice(0,10)
    const res = await fetch(`/api/books/${book.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'reading', start_date: today }) })
    if (res.ok) { const updated = await res.json(); setBooks(prev => prev.map(b => b.id === book.id ? updated : b)); setSuggestion(null) }
  }

  const wantBooks = books.filter(b => b.status === 'want')
  const readingBooks = books.filter(b => b.status === 'reading')
  const readBooks = books.filter(b => b.status === 'read')
  const hofBooks = books.filter(b => b.rating === 5)

  const readYears = [...new Set(readBooks.map(b => b.start_date?.slice(0,4)).filter(Boolean) as string[])].sort((a,b) => +b - +a)
  const filteredRead = yearFilter ? readBooks.filter(b => b.start_date?.startsWith(String(yearFilter))) : readBooks

  function tabBooks(): Book[] {
    if (tab === 'reading') return readingBooks
    if (tab === 'read') return filteredRead
    if (tab === 'want') return wantBooks
    if (tab === 'hof') return hofBooks
    return books
  }

  // Stats
  const avgRating = readBooks.filter(b => b.rating).length
    ? (readBooks.filter(b => b.rating).reduce((s, b) => s + (b.rating ?? 0), 0) / readBooks.filter(b => b.rating).length).toFixed(1)
    : '—'
  const avgDays = readBooks.filter(b => readingDays(b)).length
    ? Math.round(readBooks.filter(b => readingDays(b)).reduce((s,b) => s + (readingDays(b) ?? 0), 0) / readBooks.filter(b => readingDays(b)).length)
    : null

  function BookForm({ compact }: { compact?: boolean }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: compact ? '16px' : '20px', background: '#faf7f4', borderRadius: 12, border: '1.5px solid #e0d6cc' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} style={iStyle} />
          <input placeholder="Author *" value={form.author} onChange={e => setForm(f => ({...f, author: e.target.value}))} style={iStyle} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value as Book['status']}))} style={iStyle}>
            <option value="want">Want to Read</option>
            <option value="reading">Reading</option>
            <option value="read">Read</option>
          </select>
          <select value={form.genre} onChange={e => setForm(f => ({...f, genre: e.target.value}))} style={iStyle}>
            <option value="">Genre (optional)</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', background: '#fff', borderRadius: 8, border: '1.5px solid #e0d6cc' }}>
            <span style={{ fontSize: 13, color: '#888' }}>Rating</span>
            <Stars rating={form.rating} onChange={r => setForm(f => ({...f, rating: r}))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#888' }}>
            Date Started
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} style={iStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#888' }}>
            Date Finished
            <input type="date" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} style={iStyle} />
          </label>
        </div>
        <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={2} style={{ ...iStyle, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveBook} style={btnPrimary}>{editingId ? 'Save Changes' : 'Add Book'}</button>
          <button onClick={() => { editingId ? cancelEdit() : setShowForm(false); resetForm() }} style={btnSecondary}>Cancel</button>
        </div>
      </div>
    )
  }

  function BookCard({ book }: { book: Book }) {
    const days = readingDays(book)
    const isEditing = editingId === book.id
    return (
      <>
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
          {/* Cover */}
          <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: spineColor(book.title), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>{book.title}</span>
              </div>
            )}
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
              <button onClick={() => openEdit(book)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>✏️</button>
              <button onClick={() => deleteBook(book.id)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>🗑️</button>
            </div>
          </div>
          {/* Info */}
          <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#3d2b1f', lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{book.author}</div>
            {book.genre && <div style={{ fontSize: 11, color: '#aaa' }}>{book.genre}</div>}
            {book.rating && <Stars rating={book.rating} />}
            {days && <div style={{ fontSize: 11, color: '#8b5e3c', marginTop: 2 }}>📅 {days} days</div>}
          </div>
        </div>
        {isEditing && (
          <div style={{ gridColumn: '1 / -1' }}>
            <BookForm compact />
          </div>
        )}
      </>
    )
  }

  function HofBook({ book }: { book: Book }) {
    const days = readingDays(book)
    return (
      <div style={{ position: 'relative', breakInside: 'avoid', marginBottom: 12, borderRadius: 10, overflow: 'hidden', cursor: 'default' }} className="hof-book">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} style={{ width: '100%', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '2/3', background: spineColor(book.title), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <span style={{ color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{book.title}</span>
          </div>
        )}
        <div className="hof-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 12, opacity: 0, transition: 'opacity 0.2s' }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>{book.title}</div>
          <div style={{ color: '#ddd', fontSize: 11, textAlign: 'center', marginBottom: 6 }}>{book.author}</div>
          {days && <div style={{ color: '#f5a623', fontSize: 12 }}>⏱ {days} days</div>}
          <div style={{ color: '#f5a623', fontSize: 18, marginTop: 4 }}>★★★★★</div>
        </div>
      </div>
    )
  }

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'all', icon: '📚', label: 'All Books' },
    { id: 'reading', icon: '📖', label: 'Reading' },
    { id: 'read', icon: '✅', label: 'Finished' },
    { id: 'want', icon: '🔖', label: 'Want to Read' },
    { id: 'hof', icon: '🏆', label: 'Hall of Fame' },
  ]

  return (
    <>
      <style>{`
        .sidebar {
          width: 240px;
          min-height: 100vh;
          background: #3d2b1f;
          color: #fff;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          z-index: 100;
          transition: width 0.25s, left 0.25s;
          overflow: hidden;
        }
        .sidebar.collapsed { width: 64px; }
        .sidebar-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 99;
        }
        .nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 20px;
          background: none;
          border: none;
          color: #e8d5c4;
          font-size: 14px;
          cursor: pointer;
          width: 100%;
          text-align: left;
          border-radius: 8px;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.1); }
        .nav-btn.active { background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; }
        .sidebar.collapsed .nav-btn { justify-content: center; padding: 11px 0; }
        .sidebar.collapsed .nav-label { display: none; }
        .sidebar-header { padding: 20px 16px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); white-space: nowrap; overflow: hidden; }
        .sidebar.collapsed .sidebar-header-text { display: none; }
        .main-content { margin-left: 240px; min-height: 100vh; transition: margin-left 0.25s; }
        .main-content.collapsed { margin-left: 64px; }
        @media (max-width: 768px) {
          .sidebar { left: -240px; width: 240px !important; }
          .sidebar.mob-open { left: 0; }
          .sidebar.mob-open ~ .sidebar-overlay { display: block; }
          .main-content { margin-left: 0 !important; }
          .desktop-collapse-btn { display: none !important; }
        }
        .hof-book:hover .hof-overlay { opacity: 1 !important; }
      `}</style>

      {/* Sidebar */}
      <nav className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}${mobOpen ? ' mob-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="sidebar-header-text" style={{ fontWeight: 700, fontSize: 16 }}>📚 Reading</span>
          <button
            className="desktop-collapse-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', color: '#e8d5c4', cursor: 'pointer', fontSize: 18, padding: 4 }}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>

        <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`nav-btn${tab === item.id ? ' active' : ''}`}
              onClick={() => { setTab(item.id); setMobOpen(false) }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Stats */}
        {!sidebarCollapsed && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: '#c4a882', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>📖 {readingBooks.length} reading</div>
            <div>✅ {readBooks.length} finished</div>
            <div>🔖 {wantBooks.length} want to read</div>
            {avgDays && <div>⏱ avg {avgDays} days/book</div>}
            <div>⭐ avg rating {avgRating}</div>
          </div>
        )}

        {/* User / Logout */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {!sidebarCollapsed && <div style={{ fontSize: 11, color: '#a08060', padding: '0 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>}
          <button onClick={logout} className="nav-btn" style={{ color: '#e8d5c4' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🚪</span>
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobOpen && <div className="sidebar-overlay" onClick={() => setMobOpen(false)} />}

      {/* Main content */}
      <main className={`main-content${sidebarCollapsed ? ' collapsed' : ''}`} style={{ padding: '28px 32px' }}>
        {/* Mobile top bar */}
        <div style={{ display: 'none' }} className="mobile-topbar">
          <button onClick={() => setMobOpen(o => !o)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#3d2b1f' }}>☰</button>
        </div>
        <style>{`@media(max-width:768px){ .mobile-topbar { display: flex !important; marginBottom: 16px; } }`}</style>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setMobOpen(o => !o)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#3d2b1f', display: 'none' }} className="mob-menu-btn">☰</button>
            <h1 style={{ margin: 0, fontSize: 22, color: '#3d2b1f' }}>
              {tab === 'all' && '📚 All Books'}
              {tab === 'reading' && '📖 Currently Reading'}
              {tab === 'read' && '✅ Finished Books'}
              {tab === 'want' && '🔖 Want to Read'}
              {tab === 'hof' && '🏆 Hall of Fame'}
            </h1>
          </div>
          {tab !== 'hof' && (
            <button onClick={openAdd} style={btnPrimary}>+ Add Book</button>
          )}
        </div>
        <style>{`@media(max-width:768px){ .mob-menu-btn { display: block !important; } }`}</style>

        {/* Add form */}
        {showForm && !editingId && (
          <div style={{ marginBottom: 24 }}><BookForm /></div>
        )}

        {/* Suggestion card */}
        {tab === 'reading' && (
          <div style={{ marginBottom: 20 }}>
            {suggestion ? (
              <div style={{ background: '#fff8f0', border: '1.5px solid #e8c99a', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>📌 Suggested next read</div>
                  <div style={{ fontWeight: 700, color: '#3d2b1f' }}>{suggestion.title}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{suggestion.author}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startReading(suggestion)} style={btnPrimary}>Start Reading</button>
                  <button onClick={() => pickSuggestion(suggestion)} style={btnSecondary}>Skip</button>
                  <button onClick={() => setSuggestion(null)} style={btnSecondary}>✕</button>
                </div>
              </div>
            ) : wantBooks.length > 0 ? (
              <button onClick={() => pickSuggestion()} style={{ ...btnSecondary, fontSize: 13 }}>💡 Suggest my next read</button>
            ) : null}
          </div>
        )}

        {/* Year filter for Finished tab */}
        {tab === 'read' && readYears.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setYearFilter(null)} style={{ ...yearPill, background: !yearFilter ? '#8b5e3c' : '#f0e8e0', color: !yearFilter ? '#fff' : '#8b5e3c' }}>All</button>
            {readYears.map(y => (
              <button key={y} onClick={() => setYearFilter(+y)} style={{ ...yearPill, background: yearFilter === +y ? '#8b5e3c' : '#f0e8e0', color: yearFilter === +y ? '#fff' : '#8b5e3c' }}>{y}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#888', padding: 40, textAlign: 'center' }}>Loading…</div>
        ) : tab === 'hof' ? (
          hofBooks.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <div>No 5-star books yet. Rate a book to add it here!</div>
            </div>
          ) : (
            <div style={{ columns: 'auto 160px', columnGap: 12 }}>
              {hofBooks.map(book => <HofBook key={book.id} book={book} />)}
            </div>
          )
        ) : (
          <>
            {tabBooks().length === 0 && (
              <div style={{ color: '#888', textAlign: 'center', padding: 60, fontSize: 15 }}>
                {tab === 'all' ? 'No books yet — add your first one!' :
                 tab === 'reading' ? 'No books currently being read.' :
                 tab === 'read' ? 'No finished books yet.' :
                 'Your want-to-read list is empty.'}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
              {tabBooks().map(book => <BookCard key={book.id} book={book} />)}
            </div>
          </>
        )}
      </main>
    </>
  )
}

const iStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e0d6cc',
  fontSize: 14, outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 8, background: '#8b5e3c', color: '#fff',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '10px 16px', borderRadius: 8, background: '#f0e8e0', color: '#8b5e3c',
  fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
}
const yearPill: React.CSSProperties = {
  padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
  border: 'none', cursor: 'pointer',
}
