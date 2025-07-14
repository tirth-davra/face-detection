import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if user is trying to access the main page
  if (pathname === '/') {
    // Check for authentication in cookies or headers
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
    
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // If user is on login page and already authenticated, redirect to main page
  if (pathname === '/login') {
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';
    
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login']
}; 