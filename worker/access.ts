const COOKIE_NAME = "gifs_gmis_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

export interface AccessEnv {
  COOKIE_SECRET: string;
  DB: D1Database;
}

type Session = {
  username: string;
  expires: number;
};

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function bytesFromHex(hex: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return new Uint8Array();
  return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
}

function arrayBufferFromBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64url(new Uint8Array(signature));
}

function timingSafeEqual(left: string | Uint8Array, right: string | Uint8Array): boolean {
  const a = typeof left === "string" ? encoder.encode(left) : left;
  const b = typeof right === "string" ? encoder.encode(right) : right;
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length, 1);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a[index % a.length] ?? 0) ^ (b[index % b.length] ?? 0);
  }
  return mismatch === 0;
}

async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, roundsText, saltHex, expectedHex] = encodedHash.split("$");
  const rounds = Number(roundsText);
  if (
    algorithm !== "pbkdf2_sha256"
    || rounds !== 100_000
  ) return false;

  const salt = bytesFromHex(saltHex);
  const expected = bytesFromHex(expectedHex);
  if (salt.length < 16 || expected.length !== 32) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: arrayBufferFromBytes(salt),
    iterations: rounds,
  }, key, 256));
  return timingSafeEqual(derived, expected);
}

function getCookie(request: Request): string {
  const cookies = request.headers.get("Cookie") ?? "";
  const entry = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? entry.slice(COOKIE_NAME.length + 1) : "";
}

async function getSession(request: Request, secret: string): Promise<Session | null> {
  const [username, expiresText, signature] = getCookie(request).split(".");
  const expires = Number(expiresText);
  if (
    !/^[a-z0-9_-]{1,32}$/.test(username ?? "")
    || !Number.isSafeInteger(expires)
    || expires < Math.floor(Date.now() / 1000)
    || !signature
  ) return null;

  const expected = await hmac(`${username}.${expiresText}`, secret);
  return timingSafeEqual(signature, expected) ? { username, expires } : null;
}

function securityHeaders(contentType: string): HeadersInit {
  return {
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "Content-Type": contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function loginPage(error = false): Response {
  const errorMessage = error
    ? '<p class="error" role="alert">The username or password is incorrect.</p>'
    : "";

  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Sign in | GIF Emotion Atlas</title>
  <style>
    :root{color-scheme:dark;--ink:#f4f7f8;--muted:#9aa8b5;--line:rgba(255,255,255,.13);--panel:#121b27;--navy:#08111d;--cyan:#5adbc8}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 70% 20%,rgba(48,113,143,.22),transparent 36%),var(--navy);color:var(--ink);font-family:"Avenir Next",Avenir,"Helvetica Neue",Arial,sans-serif}
    .card{width:min(100%,430px);padding:42px 38px;background:linear-gradient(145deg,rgba(25,40,55,.98),rgba(12,24,37,.98));border:1px solid var(--line);box-shadow:0 30px 90px rgba(0,0,0,.34)}
    .brand{display:flex;align-items:center;gap:11px;margin-bottom:42px;font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}.mark{width:32px;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;background:var(--cyan);color:#050b13;font-weight:900}
    .eyebrow{margin:0 0 13px;color:var(--cyan);font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}h1{margin:0 0 12px;font-size:34px;letter-spacing:-.035em}.hint{margin:0 0 28px;color:var(--muted);font-size:14px;line-height:1.6}
    label{display:block;margin:15px 0 7px;color:#dbe4e8;font-size:13px}input{width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:4px;background:#08131f;color:var(--ink);font:inherit;outline:none}input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(90,219,200,.12)}button{width:100%;margin-top:20px;padding:14px;border:0;border-radius:4px;background:var(--cyan);color:#050b13;font:inherit;font-weight:800;cursor:pointer}button:hover{filter:brightness(1.05)}.error{margin:0 0 20px;padding:11px 12px;border-left:3px solid #ff806b;background:rgba(255,128,107,.1);color:#ffc0b5;font-size:13px}
    @media(max-width:480px){.card{padding:34px 25px}.brand{margin-bottom:34px}}
  </style>
</head>
<body>
  <main class="card">
    <div class="brand"><span class="mark">G</span><span>GIFS / GMIS</span></div>
    <p class="eyebrow">Private research workspace</p>
    <h1>GIF Emotion Atlas</h1>
    <p class="hint">Sign in with the account assigned to you.</p>
    ${errorMessage}
    <form method="post" action="/_access/login">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" autocapitalize="none" required autofocus>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in to dashboard</button>
    </form>
  </main>
</body>
</html>`, {
    status: error ? 401 : 200,
    headers: securityHeaders("text/html; charset=utf-8"),
  });
}

function redirect(location: string, cookie?: string): Response {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Location": location,
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function handleAccess(request: Request, env: AccessEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!env.COOKIE_SECRET || !env.DB) {
    return new Response("Access control is not configured.", {
      status: 503,
      headers: securityHeaders("text/plain; charset=utf-8"),
    });
  }

  if (url.pathname === "/_access/login" && request.method === "POST") {
    const form = await request.formData();
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const user = /^[a-z0-9_-]{1,32}$/.test(username)
      ? await env.DB.prepare("SELECT password_hash FROM users WHERE username = ? AND active = 1")
        .bind(username)
        .first<{ password_hash: string }>()
      : null;
    const authenticated = Boolean(user && await verifyPassword(password, user.password_hash));
    if (!authenticated) return loginPage(true);

    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const signature = await hmac(`${username}.${expires}`, env.COOKIE_SECRET);
    const cookie = `${COOKIE_NAME}=${username}.${expires}.${signature}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
    return redirect("/", cookie);
  }

  if (url.pathname === "/_access/logout") {
    const cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
    return redirect("/_access/login", cookie);
  }

  const session = await getSession(request, env.COOKIE_SECRET);
  if (!session) return loginPage(false);
  if (url.pathname === "/_access/login") return redirect("/");

  return null;
}

export function protectResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
