import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("https://gifs.gmis.me/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the GIF Emotion Atlas dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GIF Emotion Atlas \| GMIS<\/title>/i);
  assert.match(html, /GIFs, mapped/);
  assert.match(html, /3,647/);
  assert.match(html, /29\.1%/);
  assert.match(html, /\/assets\/high_conf\.csv/);
  assert.match(html, /\/assets\/disagree\.csv/);
  assert.match(html, /\/og\.png/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
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
