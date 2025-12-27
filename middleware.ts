import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware';

export function middleware(req: NextRequest) {
  // Appliquer seulement aux routes API
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const authResult = authMiddleware(req);
    if (authResult) {
      return authResult; // Retourner l'erreur si échec
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};