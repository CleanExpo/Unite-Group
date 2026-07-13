/**
 * Nexus site chat agent — embeddable widget (UNI-2359).
 *
 * Usage on any site:
 *   <script src="https://<host>/widget/nexus-agent.js" data-site-key="sk_site_..." async></script>
 *
 * Self-contained vanilla JS: shadow-DOM chat bubble + panel, all styles inline
 * inside the shadow root (no external fonts/CSS — survives host CSP that
 * allows this script's origin), streams from POST /api/agent via fetch +
 * ReadableStream SSE parsing. Endpoint URL is derived from this script's own
 * src, so it works from any embedding origin. No dependencies, no framework.
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script || !script.src) return;

  var siteKey = script.getAttribute('data-site-key');
  if (!siteKey) {
    console.warn('[nexus-agent] missing data-site-key attribute');
    return;
  }

  var endpoint = new URL('/api/agent', script.src).toString();
  var title = script.getAttribute('data-title') || 'Chat with us';
  var accent = script.getAttribute('data-accent') || '#2563eb';
  var MAX_MESSAGES = 20;
  var MAX_CHARS = 4000;

  var messages = []; // { role: 'user' | 'assistant', content: string }
  var busy = false;

  var STYLES =
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.na-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;' +
    'background:' + accent + ';color:#fff;border:none;cursor:pointer;font-size:24px;line-height:56px;' +
    'text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.25);z-index:2147483000}' +
    '.na-panel{position:fixed;bottom:88px;right:20px;width:340px;max-width:calc(100vw - 40px);' +
    'height:440px;max-height:calc(100vh - 120px);display:none;flex-direction:column;background:#fff;' +
    'color:#111;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);overflow:hidden;z-index:2147483000}' +
    '.na-panel.na-open{display:flex}' +
    '.na-head{background:' + accent + ';color:#fff;padding:12px 16px;font-size:15px;font-weight:600}' +
    '.na-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}' +
    '.na-msg{max-width:85%;padding:8px 12px;border-radius:10px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}' +
    '.na-user{align-self:flex-end;background:' + accent + ';color:#fff}' +
    '.na-bot{align-self:flex-start;background:#f1f3f5;color:#111}' +
    '.na-err{align-self:flex-start;background:#fdecea;color:#8a1c12}' +
    '.na-form{display:flex;border-top:1px solid #e5e7eb}' +
    '.na-input{flex:1;border:none;outline:none;padding:12px;font-size:14px;background:#fff;color:#111}' +
    '.na-send{border:none;background:none;color:' + accent + ';font-weight:600;font-size:14px;padding:0 14px;cursor:pointer}' +
    '.na-send:disabled{opacity:.4;cursor:default}';

  function boot() {
    var host = document.createElement('div');
    host.setAttribute('data-nexus-agent', '');
    document.body.appendChild(host);
    var root = host.attachShadow({ mode: 'closed' });

    var style = document.createElement('style');
    style.textContent = STYLES;
    root.appendChild(style);

    var bubble = document.createElement('button');
    bubble.className = 'na-bubble';
    bubble.type = 'button';
    bubble.setAttribute('aria-label', title);
    bubble.textContent = '\u{1F4AC}';
    root.appendChild(bubble);

    var panel = document.createElement('div');
    panel.className = 'na-panel';
    root.appendChild(panel);

    var head = document.createElement('div');
    head.className = 'na-head';
    head.textContent = title;
    panel.appendChild(head);

    var log = document.createElement('div');
    log.className = 'na-log';
    panel.appendChild(log);

    var form = document.createElement('form');
    form.className = 'na-form';
    panel.appendChild(form);

    var input = document.createElement('input');
    input.className = 'na-input';
    input.type = 'text';
    input.placeholder = 'Ask a question…';
    input.maxLength = MAX_CHARS;
    form.appendChild(input);

    var send = document.createElement('button');
    send.className = 'na-send';
    send.type = 'submit';
    send.textContent = 'Send';
    form.appendChild(send);

    bubble.addEventListener('click', function () {
      panel.classList.toggle('na-open');
      if (panel.classList.contains('na-open')) input.focus();
    });

    function addMessage(cls, text) {
      var el = document.createElement('div');
      el.className = 'na-msg ' + cls;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    function handleSse(block, botEl) {
      var lines = block.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('data: ') !== 0) continue;
        var payload = lines[i].slice(6);
        if (payload === '[DONE]') return true;
        try {
          var obj = JSON.parse(payload);
          if (typeof obj.delta === 'string') {
            botEl.textContent += obj.delta;
            log.scrollTop = log.scrollHeight;
          }
          if (obj.error) {
            botEl.className = 'na-msg na-err';
            botEl.textContent = 'Sorry — something went wrong. Please try again.';
          }
        } catch (e) { /* ignore malformed frame */ }
      }
      return false;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      busy = true;
      send.disabled = true;

      messages.push({ role: 'user', content: text });
      if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
      addMessage('na-user', text);
      var botEl = addMessage('na-bot', '');

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteKey: siteKey, messages: messages }),
      })
        .then(function (res) {
          if (!res.ok || !res.body) {
            botEl.className = 'na-msg na-err';
            botEl.textContent = res.status === 429
              ? 'Too many messages — please wait a moment.'
              : 'The assistant is unavailable right now.';
            return null;
          }
          var reader = res.body.getReader();
          var decoder = new TextDecoder();
          var buffer = '';
          function pump() {
            return reader.read().then(function (r) {
              if (r.done) return null;
              buffer += decoder.decode(r.value, { stream: true });
              var frames = buffer.split('\n\n');
              buffer = frames.pop();
              for (var i = 0; i < frames.length; i++) {
                if (handleSse(frames[i], botEl)) return null;
              }
              return pump();
            });
          }
          return pump();
        })
        .catch(function () {
          botEl.className = 'na-msg na-err';
          botEl.textContent = 'Connection lost — please try again.';
        })
        .then(function () {
          if (botEl.textContent && botEl.className.indexOf('na-err') === -1) {
            messages.push({ role: 'assistant', content: botEl.textContent });
            if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
          }
          busy = false;
          send.disabled = false;
          input.focus();
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
