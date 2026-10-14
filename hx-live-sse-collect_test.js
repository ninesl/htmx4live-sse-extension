const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { test } = require('node:test');
const { chromium } = require('playwright');

const cases = [
    ['{"foo":{"count":3,"secondary":4},"bar":2}', '<div hx-live-sse-collect="" hx-sse:connect="/foobar" data-htmx-powered="true" data-foo="{&quot;count&quot;:3,&quot;secondary&quot;:4}" data-bar="2"><span :text="data.foo?.count" data-htmx-powered="true">3</span><span :text="data.bar" data-htmx-powered="true">2</span></div>'],
    ['foo.count:4', '<div hx-live-sse-collect="" hx-sse:connect="/foobar" data-htmx-powered="true" data-foo="{&quot;count&quot;:4,&quot;secondary&quot;:4}" data-bar="2"><span :text="data.foo?.count" data-htmx-powered="true">4</span><span :text="data.bar" data-htmx-powered="true">2</span></div>'],
    ['{"foo":{"count":""},"bar":5}', '<div hx-live-sse-collect="" hx-sse:connect="/foobar" data-htmx-powered="true" data-foo="{&quot;count&quot;:&quot;&quot;,&quot;secondary&quot;:4}" data-bar="5"><span :text="data.foo?.count" data-htmx-powered="true"></span><span :text="data.bar" data-htmx-powered="true">5</span></div>'],
    ['{"foo":""}', '<div hx-live-sse-collect="" hx-sse:connect="/foobar" data-htmx-powered="true" data-foo="" data-bar="5"><span :text="data.foo?.count" data-htmx-powered="true"></span><span :text="data.bar" data-htmx-powered="true">5</span></div>']
];

test('SSE collection and hx-live rendering', async t => {
    const html = '<div hx-live-sse-collect hx-sse:connect="/foobar"><span :text="data.foo?.count"></span><span :text="data.bar"></span></div>';
    const clients = new Set();
    const ready = Promise.withResolvers();
    const server = createServer((request, response) => {
        if (request.url === '/foobar') {
            response.writeHead(200, { 'Content-Type': 'text/event-stream' });
            response.flushHeaders();
            clients.add(response);
            response.on('close', () => clients.delete(response));
            if (clients.size === 2) ready.resolve();
        } else response.writeHead(request.url === '/' ? 200 : 404, { 'Content-Type': 'text/html' }).end();
    });
    t.after(() => { server.closeAllConnections(); server.close(); });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
    t.after(() => browser.close());
    const pages = [];
    await Promise.all(['hx-live-sse-collect.js', 'hx-live-sse-collect.min.js'].map(async file => {
        const page = await browser.newPage();
        pages.push([file, page]);
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.setContent(`<meta name="htmx-config" content='{"extensions":"sse,hx-live,hx-live-sse-collect"}'>`);
        for (const script of [
            require.resolve('htmx.org'),
            require.resolve('htmx.org/dist/ext/hx-live.min.js'),
            require.resolve('htmx.org/dist/ext/hx-sse.min.js'),
            './' + file
        ]) await page.addScriptTag({ path: script });
        await page.evaluate(html => {
            document.body.innerHTML = html;
            htmx.process(document.body);
        }, html);
    }));
    await ready.promise;

    for (const [message, expected] of cases) {
        await t.test(message, async () => {
            await Promise.all([...clients].map(client => new Promise((resolve, reject) => {
                client.write(`data: ${message}\n\n`, error => error ? reject(error) : resolve());
            })));
            await Promise.all(pages.map(async ([file, page]) => {
                const actual = await page.locator('[hx-live-sse-collect]').evaluate(div => div.outerHTML);
                assert.equal(actual, expected, file);
            }));
        });
    }
});
