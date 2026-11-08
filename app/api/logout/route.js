import { NextResponse } from 'next/server';

export async function POST(req) {
  const res = NextResponse.redirect(new URL('/login', req.url), { status: 303 });
  res.cookies.delete('dash_session');
  return res;
}
