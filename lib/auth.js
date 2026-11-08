// Edge-compatible session token: an HMAC of a fixed string, keyed by the
// shared DASHBOARD_PASSWORD. Anyone who knows the password can derive the
// same token, same as any single-shared-password gate — this is meant to
// keep casual/accidental access out, not to resist a targeted attacker.

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function sessionToken(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('the-dashboard-session-v1'));
  return bufToHex(sig);
}
