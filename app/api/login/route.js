import { NextResponse } from 'next/server';
import { sessionToken } from '../../../lib/auth';

export async function POST(req) {
  const form = await req.formData();
  const password = form.get('password');
  const secret = process.env.DASHBOARD_PASSWORD;

  const loginUrl = new URL('/login', req.url);

  if (!secret) {
    loginUrl.searchParams.set('error', 'config');
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  if (password !== secret) {
    loginUrl.searchParams.set('error', '1');
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const token = await sessionToken(secret);
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  res.cookies.set('dash_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
