# hx-live-sse-collect

Tag an element with `hx-live-sse-collect` and [`hx-sse:connect`](https://four.htmx.org/extensions/hx-sse). The extension writes the incoming `data: {json}` as `data-*` tags directly on the same element.

```html
<div hx-live-sse-collect hx-sse:connect="/foobar">
  <span :text="data.foo?.count"></span><span :text="data.bar"></span>
</div>
```

This approach follows the [locality of behavior principles](https://four.htmx.org/essays/locality-of-behaviour) HTMX is built on. `HCON`/`JSON` sent lives on the `div` you wire up, and [all its child elements directly have access to the `data-*`](https://four.htmx.org/docs/hx-live-guide#scoping-data) which can drastically reduce serialization/deserialization `hx-live` has to on DOM updates.

The `data: ` sent from your `hx-sse` connection MUST be valid [`JSON`/`HCON`.](https://four.htmx.org/docs/hcon-guide) An error is sent to HTMX when parsing fails and the DOM remains unmodified.

```javascript
const incoming = api.HCON.parse(message.data);
const current = htmx.live.q(source).local.data;
const keys = Object.keys(incoming);
const pairs = keys.map(key => [key, current[key]]);
const existing = Object.fromEntries(pairs);
const merged = api.HCON.merge(incoming, existing);
Object.assign(current, merged);
```

> I purposefully avoid accepting DOM elements from the `hx-sse` connection. I want elements tagged with `hx-live-sse-collect` behavior and intent to be as obvious as possible, [to you or an LLM.](https://ninescoding.com/WhyAPIDesignIsStillImportantForAgentsAndHumansInTheLoop) This behavior can be modified by changing the `.js` extension script. How HTMX or `hx-live` handles edge cases past this point? `¯\_(ツ)_/¯`

```javascript
// `hx-sse` message sent from the server:
data: {"foo":{"count":3,"secondary":4},"bar":2}
```

`hx-live-sse-collect` sees the `hx-sse` `data: ` message coming from `/foobar` and merges the incoming object onto the element.

```javascript
const incoming = api.HCON.parse(message.data);
const current = htmx.live.q(source).local.data;

Object.assign(current, api.HCON.merge(
    incoming,
    Object.fromEntries(Object.keys(incoming).map(key => [key, current[key]]))
));
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

HCON [leaves existing values alone](https://four.htmx.org/docs/hcon-guide), allowing for targeted or partial updates.

```html
<div 
  hx-live-sse-collect 
  hx-sse:connect="/foobar" 
  data-foo='{"count":4,"secondary":4}' 
  data-bar="2">
  <span :text="data.foo?.count">4</span><span :text="data.bar">2</span>
</div>
```

This message will clear the `count` field:

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

A blank string like `data: {"foo":""}` sets `data-foo=""` in the DOM. This does [not remove the actual `data-*`](https://four.htmx.org/extensions/hx-live#data) tag on the element.
