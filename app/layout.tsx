import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reading Tracker',
  description: 'Track your reading journey',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f0eb' }}>
        {children}
      </body>
    </html>
  )
}
