'use client'
import { useState } from 'react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Signup failed')
      } else {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Something went wrong, please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>📚 Reading Tracker</h1>
        <p style={styles.subtitle}>Create your account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
        <p style={styles.link}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#8b5e3c' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f0eb',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 48px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
  },
  title: { fontSize: 28, margin: '0 0 4px', color: '#3d2b1f' },
  subtitle: { color: '#888', marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1.5px solid #e0d6cc',
    fontSize: 15,
    outline: 'none',
  },
  btn: {
    padding: '12px',
    borderRadius: 8,
    background: '#8b5e3c',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    marginTop: 4,
  },
  error: { color: '#c0392b', fontSize: 13, margin: 0 },
  link: { marginTop: 20, color: '#666', fontSize: 14 },
}
