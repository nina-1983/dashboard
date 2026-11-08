import { NextResponse } from 'next/server';
import { sessionToken } from './lib/auth';

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(req) {
  const secret = process.env.DASHBOARD_PASSWORD;

  if (secret) {
    const cookie = req.cookies.get('dash_session')?.value;
    const expected = await sessionToken(secret);
    if (cookie === expected) {
      return NextResponse.next();
    }
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  return NextResponse.redirect(loginUrl);
}
