import { NextRequest, NextResponse } from 'next/server'
import { decryptEdge } from '@/lib/session-edge'

const publicRoutes = ['/login', '/signup']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Let API routes pass through
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session')?.value
  const session = token ? await decryptEdge(token) : null

  // Redirect unauthenticated users to login
  if (!session && !publicRoutes.includes(pathname) && pathname !== '/') {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (session && (publicRoutes.includes(pathname) || pathname === '/')) {
    const dashboardUrl = req.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
