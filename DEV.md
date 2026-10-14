# Development

```sh
npm ci
npx playwright install chromium
npm test
```

`npm test` runs the same table-driven tests against the source and existing `.min.js`, without regenerating it. Chromium launches once, with a separate persistent DOM for each file.

A local Node HTTP server broadcasts each table entry over real SSE to both pages simultaneously. Browser fetch, `hx-sse`, and `hx-live` run unmodified.

To regenerate only `hx-live-sse-collect.min.js`:

```sh
npm run minify
```

Commit the regenerated `.min.js` with source changes. We use Terser 5.49.0 and the compression/mangling options from [HTMX's extension build script](https://github.com/bigskysoftware/htmx/blob/60ace4893291a75482e3a7b10af8edad5ea201a0/package.json#:~:text=%22build%3Aext%22), without source maps.
