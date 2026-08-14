import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const TEST_USERNAME = "sj";
const TEST_PASSWORD = "test-password-only";
const TEST_SECRET = "test-cookie-secret-with-at-least-32-characters";
const TEST_SALT = "00112233445566778899aabbccddeeff";
const TEST_HASH = `pbkdf2_sha256$100000$${TEST_SALT}$${pbkdf2Sync(TEST_PASSWORD, Buffer.from(TEST_SALT, "hex"), 100000, 32, "sha256").toString("hex")}`;

function mockDatabase() {
  return {
    prepare(query) {
      assert.match(query, /SELECT password_hash FROM users/i);
      return {
        bind(username) {
          return {
            async first() {
              return username === TEST_USERNAME ? { password_hash: TEST_HASH } : null;
            },
          };
        },
      };
    },
  };
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

function environment() {
  return {
    ASSETS: {
      fetch: async (request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/_next/static/css/dashboard.css") {
          return new Response("body{background:#08111d}", { headers: { "content-type": "text/css" } });
        }
        return pathname === "/assets/high_conf.csv"
          ? new Response("gif_id,emotion\n1,happy\n", { headers: { "content-type": "text/csv" } })
          : new Response("Not found", { status: 404 });
      },
    },
    COOKIE_SECRET: TEST_SECRET,
    DB: mockDatabase(),
  };
}

const context = { waitUntil() {}, passThroughOnException() {} };

async function signIn(worker, username = TEST_USERNAME, password = TEST_PASSWORD) {
  return worker.fetch(new Request("https://gifs.gmis.me/_access/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  }), environment(), context);
}

async function renderAuthenticated() {
  const worker = await loadWorker();
  const login = await signIn(worker);
  assert.equal(login.status, 303);
  assert.equal(login.headers.get("location"), "/");
  const setCookie = login.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /^gifs_gmis_session=sj\./);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);

  const cookie = setCookie.split(";", 1)[0];
  const response = await worker.fetch(
    new Request("https://gifs.gmis.me/", {
      headers: { accept: "text/html", cookie },
    }),
    environment(),
    context,
  );
  return { response, worker, cookie };
}

test("requires a login before rendering the dashboard", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("https://gifs.gmis.me/", { headers: { accept: "text/html" } }),
    environment(),
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/i);
  const html = await response.text();
  assert.match(html, /Sign in \| GIF Emotion Atlas/);
  assert.match(html, /Private research workspace/);
  assert.doesNotMatch(html, /GIFs, mapped/);
});

test("rejects invalid credentials without identifying the failed field", async () => {
  const worker = await loadWorker();
  const response = await signIn(worker, TEST_USERNAME, "wrong-password");
  assert.equal(response.status, 401);
  assert.match(await response.text(), /username or password is incorrect/i);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("signs a session and server-renders the GIF Emotion Atlas dashboard", async () => {
  const { response } = await renderAuthenticated();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);

  const html = await response.text();
  assert.match(html, /<title>GIF Emotion Atlas \| GMIS<\/title>/i);
  assert.match(html, /GIFs, mapped/);
  assert.match(html, /3,647/);
  assert.match(html, /29\.1%/);
  assert.match(html, /\/assets\/high_conf\.csv/);
  assert.match(html, /\/assets\/disagree\.csv/);
  assert.match(html, /\/og\.png/);
  assert.match(html, /\/_access\/logout/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("rejects a tampered session and clears a valid session on logout", async () => {
  const { worker, cookie } = await renderAuthenticated();
  const tampered = await worker.fetch(
    new Request("https://gifs.gmis.me/assets/high_conf.csv", {
      headers: { cookie: `${cookie}x` },
    }),
    environment(),
    context,
  );
  assert.match(await tampered.text(), /Sign in to dashboard/);

  const logout = await worker.fetch(
    new Request("https://gifs.gmis.me/_access/logout", { headers: { cookie } }),
    environment(),
    context,
  );
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get("location"), "/_access/login");
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("protects data files and serves them only with a valid session", async () => {
  const { worker, cookie } = await renderAuthenticated();
  const response = await worker.fetch(
    new Request("https://gifs.gmis.me/assets/high_conf.csv", { headers: { cookie } }),
    environment(),
    context,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/csv/i);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);
  assert.match(await response.text(), /gif_id,emotion/);
});

test("serves authenticated framework stylesheets through the asset binding", async () => {
  const { worker, cookie } = await renderAuthenticated();
  const response = await worker.fetch(
    new Request("https://gifs.gmis.me/_next/static/css/dashboard.css", { headers: { cookie } }),
    environment(),
    context,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/css/i);
  assert.match(await response.text(), /background:#08111d/);
});

test("keeps the update surface centralized", async () => {
  const [page, data, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /from "\.\/dashboard-data"/);
  assert.match(data, /totalGifs: "3,647"/);
  assert.match(data, /agreement: "29\.1%"/);
  assert.match(layout, /https:\/\/gifs\.gmis\.me/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton|starter/);
});
