# GIF Emotion Atlas

Research dashboard for the StockTwits GIF emotion analysis, published at
`https://gifs.gmis.me` on Cloudflare and versioned in `gm-is/gifs.gmis.me`.

## Update the dashboard

- Update summary values and table rows in `app/dashboard-data.ts`.
- Update prose or sections in `app/page.tsx`.
- Replace charts and downloadable CSVs in `public/assets/` using the same names.
- Replace `public/og.png` when the social preview needs to change.

Run `npm test` to build and validate the rendered dashboard. Run
`npm run deploy:cloudflare` to publish the current build to `gifs.gmis.me`.

Cloudflare build and custom-domain settings live in `wrangler.jsonc`. The
production Worker can be connected to this repository so pushes to `main`
build and deploy future updates.
