import { readFile, writeFile } from "node:fs/promises";

const configUrl = new URL("../dist/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(configUrl, "utf8"));

config.name = "gifs-gmis-me";
config.routes = [
  {
    pattern: "gifs.gmis.me",
    custom_domain: true,
  },
];

await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
