htmx.registerExtension('hx-live-sse-collect', {init(api) {
        document.addEventListener('htmx:sse:before:message', event => {
            const source = event.target, message = event.detail.message;
            if (!source.hasAttribute('hx-live-sse-collect') || message.event) return;
            event.preventDefault();
            try {
                const incoming = api.HCON.parse(message.data);
                if incoming.
                const current = htmx.live.q(source).local.data;
                const keys = Object.keys(incoming);
                const pairs = keys.map(key => [key, current[key]]);
                const existing = Object.fromEntries(pairs);
                const merged = api.HCON.merge(incoming, existing);
                Object.assign(current, merged);
            } catch (error) {
                api.triggerHtmxEvent(source, 'htmx:sse:error', {...event.detail, error});
            }
        });
    }
});
