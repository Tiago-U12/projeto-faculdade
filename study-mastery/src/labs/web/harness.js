/* Study Mastery — harness do Web Lab. Roda DENTRO do iframe isolado (sandbox sem allow-same-origin, CSP sem rede),
   antes do código do estudante. Captura console e erros, protege laços, responde a pedidos de teste da página.
   O código do estudante roda na mesma página e PODE adulterar este harness: o resultado é educativo, não à prova de
   fraude. A página do app valida origem, nonce, exercício, versão e formato de cada mensagem. */
(function (cfg) {
  'use strict';
  var me = document.currentScript;
  if (me && me.parentNode) me.parentNode.removeChild(me);
  var P = window.parent;
  var post = Function.prototype.call.bind(P.postMessage, P);
  var nonce = cfg.nonce;
  var stringify = JSON.stringify;
  var now = performance.now.bind(performance);
  var sent = 0;
  function send(type, payload) {
    try {
      post({ v: 1, nonce: nonce, exerciseId: cfg.exerciseId, version: cfg.version, type: type, payload: payload }, '*');
    } catch (e) { /* mensagem não clonável: ignorada */ }
  }

  /* ---------- console didático ---------- */
  function show(v, depth) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    var t = typeof v;
    if (t === 'string') return depth ? stringify(v) : v;
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(v);
    if (t === 'symbol') return v.toString();
    if (t === 'function') return 'ƒ ' + (v.name || 'anônima') + '()';
    if (v instanceof Error) return v.name + ': ' + v.message;
    if (typeof Element !== 'undefined' && v instanceof Element) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + (v.className && typeof v.className === 'string' ? '.' + v.className.trim().split(/\s+/).join('.') : '') + '>';
    if (depth > 2) return Array.isArray(v) ? '[…]' : '{…}';
    try {
      if (Array.isArray(v)) return '[' + v.slice(0, 50).map(function (x) { return show(x, depth + 1); }).join(', ') + (v.length > 50 ? ', …' : '') + ']';
      var keys = Object.keys(v).slice(0, 30);
      return '{' + keys.map(function (k) { return k + ': ' + show(v[k], depth + 1); }).join(', ') + (Object.keys(v).length > 30 ? ', …' : '') + '}';
    } catch (e) {
      return String(v);
    }
  }
  function log(level, args) {
    if (sent > 300) return;
    sent++;
    var text = sent > 300 ? '… mais mensagens omitidas' : Array.prototype.map.call(args, function (a) { return show(a, 0); }).join(' ');
    send('console', { level: level, text: text.slice(0, 2000) });
  }
  ['log', 'info', 'warn', 'error', 'debug', 'table'].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      log(level === 'table' || level === 'debug' ? 'log' : level, arguments);
      if (orig) orig.apply(console, arguments);
    };
  });
  addEventListener('error', function (e) {
    var line = e.lineno && cfg.scriptLine ? e.lineno - cfg.scriptLine + 1 : 0;
    send('error', { message: String(e.message || 'Erro'), line: line > 0 ? line : null, col: e.colno || null });
  });
  addEventListener('unhandledrejection', function (e) {
    send('error', { message: 'Promise rejeitada: ' + show(e.reason, 0), line: null, col: null });
  });
  // a CSP não cobre a navegação do próprio iframe: cliques em links para fora são barrados aqui. (A Navigation API não
  // emite eventos em documentos de origem opaca, então location.href por script não pode ser impedido; a página do app
  // detecta a troca de documento e encerra a prévia.)
  function external(url) {
    try {
      var u = new URL(url, location.href);
      return u.protocol !== 'about:' && u.protocol !== 'javascript:' && u.href.split('#')[0] !== location.href.split('#')[0];
    } catch (e) {
      return false;
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (a && external(a.href) && !e.defaultPrevented) {
      e.preventDefault();
      log('warn', ['Link barrado: ' + String(a.href).slice(0, 200) + ' — o laboratório não abre outros endereços.']);
    }
  });
  // envio de formulário sem preventDefault recarregaria a página isolada (e perderia o estado): é barrado e explicado
  addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    log('warn', ['Formulário enviado sem preventDefault(): num site de verdade a página seria recarregada. Aqui o envio foi barrado.']);
  });
  addEventListener('securitypolicyviolation', function (e) {
    send('blocked', { uri: String(e.blockedURI || '').slice(0, 300), directive: String(e.effectiveDirective || e.violatedDirective || '') });
  });

  /* ---------- proteção contra laço infinito (chamada no início de cada laço pelo código instrumentado) ---------- */
  var start = now();
  var n = 0;
  (function tick() {
    start = now();
    setTimeout(tick, 50);
  })();
  Object.defineProperty(window, '__smLoop', {
    value: function () {
      if ((++n & 1023) === 0 && now() - start > cfg.loopMs) {
        start = now();
        throw new RangeError('Laço interrompido: rodou mais de ' + cfg.loopMs / 1000 + ' s sem parar (laço infinito?). Confira a condição de parada.');
      }
    },
  });
  setInterval(function () { send('beat', null); }, 500);

  /* ---------- testes declarativos ---------- */
  var norm = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  var lower = function (s) { return norm(s).toLowerCase(); };
  function q(sel) { return document.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function accName(el) {
    var a = el.getAttribute('aria-label');
    if (a && norm(a)) return norm(a);
    var by = el.getAttribute('aria-labelledby');
    if (by) {
      var t = by.split(/\s+/).map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ''; }).join(' ');
      if (norm(t)) return norm(t);
    }
    if (el.labels && el.labels.length) {
      var l = Array.prototype.map.call(el.labels, function (x) { return x.textContent; }).join(' ');
      if (norm(l)) return norm(l);
    }
    if (/^(BUTTON|A)$/.test(el.tagName) && norm(el.textContent)) return norm(el.textContent);
    if (el.tagName === 'IMG') return norm(el.getAttribute('alt'));
    return norm(el.getAttribute('title'));
  }
  function deepEqual(a, b) { return stringify(a) === stringify(b); }
  function check(c) {
    var el, els, v;
    switch (c.kind) {
      case 'exists':
        return q(c.sel) ? null : 'Não encontrei ' + c.what + '.';
      case 'count':
        els = qa(c.sel);
        if (c.min != null && els.length < c.min) return 'Encontrei ' + els.length + ' ' + c.what + '; o mínimo é ' + c.min + '.';
        if (c.max != null && els.length > c.max) return 'Encontrei ' + els.length + ' ' + c.what + '; o máximo é ' + c.max + '.';
        return null;
      case 'text':
        el = q(c.sel);
        if (!el) return 'Não encontrei ' + c.what + '.';
        v = c.caseSensitive ? norm(el.textContent) : lower(el.textContent);
        var e = c.caseSensitive ? norm(c.equals != null ? c.equals : c.includes) : lower(c.equals != null ? c.equals : c.includes);
        if (c.nonEmpty) return v ? null : c.what + ' está vazio.';
        if (c.equals != null) return v === e ? null : c.what + ' mostra "' + norm(el.textContent).slice(0, 80) + '"; o esperado é "' + norm(c.equals) + '".';
        return v.indexOf(e) >= 0 ? null : c.what + ' não contém "' + norm(c.includes) + '".';
      case 'attr':
        els = qa(c.sel);
        if (!els.length) return 'Não encontrei ' + c.what + '.';
        for (var i = 0; i < els.length; i++) {
          v = els[i].getAttribute(c.name);
          if (c.present && v === null) return c.what + ' precisa do atributo ' + c.name + '.';
          if (c.nonEmpty && !norm(v)) return c.what + ' precisa de ' + c.name + ' preenchido.';
          if (c.equals != null && lower(v) !== lower(c.equals)) return c.what + ': ' + c.name + ' deveria ser "' + c.equals + '".';
        }
        return null;
      case 'style':
        el = q(c.sel);
        if (!el) return 'Não encontrei ' + c.what + '.';
        v = getComputedStyle(el).getPropertyValue(c.prop).trim();
        return c.oneOf.indexOf(v) >= 0 ? null : c.what + ': ' + c.prop + ' está "' + v + '"; esperado ' + c.oneOf.map(function (x) { return '"' + x + '"'; }).join(' ou ') + '.';
      case 'columns':
        el = q(c.sel);
        if (!el) return 'Não encontrei ' + c.what + '.';
        v = getComputedStyle(el).gridTemplateColumns;
        var cols = v === 'none' ? 1 : v.split(' ').filter(Boolean).length;
        return cols === c.equals ? null : c.what + ' tem ' + cols + ' coluna(s) nesta largura; o esperado é ' + c.equals + '.';
      case 'disabled':
        el = q(c.sel);
        if (!el) return 'Não encontrei ' + c.what + '.';
        return !!el.disabled === c.equals ? null : c.what + (c.equals ? ' deveria estar desabilitado.' : ' deveria estar habilitado.');
      case 'value':
        el = q(c.sel);
        if (!el) return 'Não encontrei ' + c.what + '.';
        return String(el.value) === c.equals ? null : c.what + ' tem "' + String(el.value).slice(0, 80) + '"; o esperado é "' + c.equals + '".';
      case 'fits':
        v = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        return v <= 1 ? null : 'A página está ' + v + 'px mais larga que a tela (rolagem lateral).';
      case 'labelled':
        els = qa(c.sel);
        if (!els.length) return 'Não encontrei ' + c.what + '.';
        var bad = els.filter(function (x) { return !accName(x); });
        return bad.length ? bad.length + ' de ' + els.length + ' ' + c.what + ' sem rótulo acessível (label, aria-label ou texto).' : null;
      case 'call':
        var fn = (window.__smExports || {})[c.fn];
        if (typeof fn !== 'function') return 'A função ' + c.fn + ' não foi encontrada no script.';
        var args = JSON.parse(stringify(c.args));
        var before = stringify(args);
        try {
          v = fn.apply(null, args);
        } catch (err) {
          return c.fn + ' lançou um erro: ' + show(err, 0);
        }
        var call = c.fn + '(' + c.args.map(function (a) { return show(a, 1); }).join(', ') + ')';
        if (c.pure && stringify(args) !== before) return call + ' modificou o array/objeto recebido; devolva um novo em vez de alterar o original.';
        return deepEqual(v, c.equals) ? null : call + ' devolveu ' + show(v, 1) + (c.reveal ? '; o esperado é ' + show(c.equals, 1) : '') + '.';
      case 'throws':
        var tf = (window.__smExports || {})[c.fn];
        if (typeof tf !== 'function') return 'A função ' + c.fn + ' não foi encontrada no script.';
        var tcall = c.fn + '(' + c.args.map(function (a) { return show(a, 1); }).join(', ') + ')';
        try {
          tf.apply(null, JSON.parse(stringify(c.args)));
        } catch (err) {
          var ctor = err && err.constructor && err.constructor.name;
          if ((err && err.name) !== c.errorName && ctor !== c.errorName) return tcall + ' lançou ' + show(err, 0) + ', mas o esperado é um ' + c.errorName + '.';
          for (var k in c.props || {}) if (!deepEqual(err[k], c.props[k])) return tcall + ': o erro deveria ter ' + k + ' = ' + show(c.props[k], 1) + ' (tem ' + show(err[k], 1) + ').';
          return null;
        }
        return tcall + ' deveria lançar ' + c.errorName + ', mas não lançou erro.';
      case 'no-errors':
        return errors.length ? 'O script gerou erro: ' + errors[0] : null;
    }
    return 'Verificação desconhecida.';
  }
  var errors = [];
  addEventListener('error', function (e) { errors.push(String(e.message)); });
  var nativeValue = {
    INPUT: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set,
    TEXTAREA: Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set,
    SELECT: Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set,
  };
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function step(s) {
    var el = q(s.sel);
    if (!el) throw new Error('Não encontrei ' + s.what + ' para ' + (s.do === 'fill' ? 'preencher' : s.do === 'click' ? 'clicar' : 'enviar') + '.');
    if (s.do === 'fill') {
      (nativeValue[el.tagName] || function (v) { this.value = v; }).call(el, s.value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (s.do === 'click') {
      el.click();
    } else if (s.do === 'submit') {
      var f = el.tagName === 'FORM' ? el : el.form;
      if (!f) throw new Error(s.what + ' não está num formulário.');
      if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }
  async function runTest(t) {
    await wait(30);
    try {
      for (var i = 0; i < (t.steps || []).length; i++) {
        step(t.steps[i]);
        await wait(20);
      }
      await wait(30);
      var msgs = [];
      for (var j = 0; j < t.checks.length; j++) {
        var m = check(t.checks[j]);
        if (m) msgs.push(m);
      }
      return { passed: msgs.length === 0, message: msgs[0] || null };
    } catch (err) {
      return { passed: false, message: show(err, 0) };
    }
  }
  addEventListener('message', function (e) {
    var d = e.data;
    if (e.source !== P || !d || d.nonce !== nonce || d.type !== 'run-test') return;
    runTest(d.test).then(function (r) { send('result', { testId: d.test.id, passed: r.passed, message: r.message }); });
  });
  addEventListener('load', function () { send('ready', null); });
})(__SM_CONFIG__);
