# hx-live-sse-collect

[![Tests](https://github.com/ninesl/htmx4live-sse-extension/actions/workflows/test.yml/badge.svg)](https://github.com/ninesl/htmx4live-sse-extension/actions/workflows/test.yml)

Tag an element with `hx-live-sse-collect` and [`hx-sse:connect`](https://four.htmx.org/extensions/hx-sse). The extension accumulates state from incoming JSON/HCON messages in `data-*` attributes directly on the same element.

```html
<div hx-live-sse-collect hx-sse:connect="/foobar">
  <span :text="data.foo?.count"></span><span :text="data.bar"></span>
</div>
```

This approach follows the [locality of behavior principles](https://four.htmx.org/essays/locality-of-behaviour) HTMX is built on. `HCON`/`JSON` sent lives on the `div` you wire up, and [all its child elements directly have access to the `data-*`](https://four.htmx.org/docs/hx-live-guide#scoping-data) which can drastically reduce serialization/deserialization `hx-live` has to on DOM updates.

The `data: ` sent from your `hx-sse` connection MUST be valid [JSON](https://four.htmx.org/docs/hcon-guide#json-fallback) or [HCON](https://four.htmx.org/docs/hcon-guide#syntax). A `htmx:sse:error` event is emitted when parsing fails and the DOM remains unmodified.

```javascript
// `hx-sse` message sent from the server:
data: {"foo":{"count":3,"secondary":4},"bar":2}
```

`hx-live-sse-collect` sees the `hx-sse` `data: ` message coming from `/foobar` and merges the incoming object onto the element.

```javascript
const incoming = api.HCON.parse(message.data);
const current = htmx.live.q(source).local.data;
const keys = Object.keys(incoming);
const pairs = keys.map(key => [key, current[key]]);
const existing = Object.fromEntries(pairs);
const merged = api.HCON.merge(incoming, existing);
Object.assign(current, merged);
```

After the extension successfully consumed the `hx-sse` message the DOM will look like this:

```html
<div 
  hx-live-sse-collect 
  hx-sse:connect="/foobar" 
  data-foo='{"count":3,"secondary":4}' 
  data-bar="2">
  <span :text="data.foo?.count">3</span><span :text="data.bar">2</span>
</div>
```

The values get inserted into the DOM via hx-live. Attribute changes automatically trigger hx-live's [DOM-based reactivity](https://four.htmx.org/docs/hx-live-guide#dom-based-reactivity).

Take this second message sent by the `hx-sse` connection:
```javascript
data: foo.count:4
```

The [dot-notation for nested keys](https://four.htmx.org/docs/hcon-guide#dot-notation-for-nested-keys) targets `foo.count`. The extension's merge preserves omitted fields, including nested fields, allowing for targeted or partial updates.

```html
<div 
  hx-live-sse-collect 
  hx-sse:connect="/foobar" 
  data-foo='{"count":4,"secondary":4}' 
  data-bar="2">
  <span :text="data.foo?.count">4</span><span :text="data.bar">2</span>
</div>
```

This message sets the `count` field to an empty string:

```javascript
// `hx-sse` message sent from the server:
data: {"foo":{"count":""},"bar":5}
```

```html
<div 
  hx-live-sse-collect 
  hx-sse:connect="/foobar" 
  data-foo='{"count":"","secondary":4}' 
  data-bar="5">
  <span :text="data.foo?.count"></span><span :text="data.bar">5</span>
</div>
```

I purposefully chose to NOT accept DOM elements from the `hx-sse` connection. Intent and behavior of the element that has `hx-sse:connect` and `hx-live-sse-collect` should be obvious [to you and your LLM.](https://ninescoding.com/WhyAPIDesignIsStillImportantForAgentsAndHumansInTheLoop) This behavior can be modified by changing the `.js` extension script. 

An SSE event with a blank string `data: {"foo":""}` would set `data-foo=""` in the DOM. This does [not remove the actual `data-*`](https://four.htmx.org/extensions/hx-live#data:~:text=Delete%20a%20value%20or%20assign%20undefined%20to%20remove%20its%20attribute) attribute on the element.
 
Server-driven deletion could be useful for something like livestream chat. A moderator removes a message, and the server tells connected clients to remove `data-*` from their local state.

I'd recommend to use something like `hx-on:click="delete data.foo"` for local DOM state removal. Descendant elements have access to parent’s data, so control can live alongside the content it affects. If a later message includes `foo`, it is added back.
