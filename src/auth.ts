// ===== PASSWORD HASHING =====
// Generate hash from password using PBKDF2
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Use a fixed salt for consistency (in production, you'd use random salt per password)
  // But since we're hashing ONE admin password that's already set, this is fine
  const salt = encoder.encode('report_toys_salt_v1');

  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(bits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ===== SESSION MANAGEMENT =====
// Generate random session token
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Create signed session cookie value
export async function createSessionCookie(
  sessionToken: string,
  sessionSecret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(sessionToken)
  );

  const sigArray = Array.from(new Uint8Array(signature));
  const sigHex = sigArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `${sessionToken}.${sigHex}`;
}

// Verify signed session cookie
export async function verifySessionCookie(
  cookieValue: string,
  sessionSecret: string
): Promise<string | null> {
  const [sessionToken, signature] = cookieValue.split('.');

  if (!sessionToken || !signature) {
    return null;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(sessionToken)
    );

    return isValid ? sessionToken : null;
  } catch (e) {
    console.error('Session verification error:', e);
    return null;
  }
}

// ===== COOKIE PARSING =====
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}

// ===== HELPERS =====
export function createLoginResponse(message: string, status: number = 401) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSuccessResponse(data: any = {}, setCookieHeader?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (setCookieHeader) {
    headers['Set-Cookie'] = setCookieHeader;
  }

  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    headers,
  });
}

export function createLogoutResponse() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    },
  });
}
