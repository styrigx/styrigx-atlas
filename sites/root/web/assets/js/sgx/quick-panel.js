/**
 * 快捷面板（图志根站）：顶栏右圆打开 #sgx-qp（<dialog> 模态），点遮罩 / 系统返回 / Esc 关闭。
 * 三个开关（与主站快捷面板同一写法，写端共用 SgxUI.encode）：
 * - 深色模式：在 dark / light 之间切（写 sgx-ui cookie，再 SgxUI.apply 立即重绘）。
 * - 跟随系统：mode 写回 system。
 * - 语言：lang 写成另一种语言，并跳到另一种语言的首页（/ ↔ /en/）。
 * 快捷链接（博客 / 奇趣 / 日刻 / 主站）是普通 <a>，不用脚本。
 * cookie 写法与主站写端完全相同：sgx-ui=<base64url JSON>; Domain=styrigx.com; Path=/; Max-Age=34560000; SameSite=Lax; Secure
 */
(function () {
  var doc = document, G = window;
  var COOKIE_ATTRS = '; Domain=styrigx.com; Path=/; Max-Age=34560000; SameSite=Lax; Secure';

  function read() {
    var U = G.SgxUI;
    try { return U && U.read ? (U.read() || null) : null; } catch (e) { return null; }
  }
  function write(obj) {
    var U = G.SgxUI;
    if (!U || !U.encode) return;
    try { doc.cookie = 'sgx-ui=' + U.encode(obj) + COOKIE_ATTRS; } catch (e) {}
  }
  function apply() {
    var U = G.SgxUI;
    try { if (U && U.apply) U.apply(doc.documentElement); } catch (e) {}
  }
  function mode() {
    var o = read();
    return o && o.mode ? o.mode : 'system';
  }
  function setMode(m) {
    var o = read() || { v: 2 };
    o.v = 2; o.mode = m;
    write(o); apply(); paint();
  }
  function setLang(lang) {
    var o = read() || { v: 2 };
    o.v = 2; o.lang = lang;
    write(o);
    G.location.href = lang === 'en' ? '/en/' : '/';
  }

  /* ---------- 面板开关 ---------- */
  var btn = doc.querySelector('[data-sgx-qp]');
  var dlg = doc.getElementById('sgx-qp');
  if (!btn || !dlg || typeof dlg.showModal !== 'function') return;
  var open = false, sentinel = false;

  function paint() {
    var m = mode();
    var dark = dlg.querySelector('[data-qp="dark"]');
    var sys = dlg.querySelector('[data-qp="system"]');
    if (dark) {
      dark.setAttribute('aria-pressed', m === 'dark' ? 'true' : 'false');
      var s = dark.querySelector('[data-qp-state]');
      if (s) s.textContent = m === 'dark' ? '开' : '关';
    }
    if (sys) {
      sys.setAttribute('aria-pressed', m === 'system' ? 'true' : 'false');
      var s2 = sys.querySelector('[data-qp-state]');
      if (s2) s2.textContent = m === 'system' ? '开' : '关';
    }
  }
  function show() {
    if (open) return;
    open = true; paint();
    try { dlg.showModal(); } catch (e) { open = false; return; }
    btn.setAttribute('aria-expanded', 'true');
    try { history.pushState({ sgxQp: 1 }, ''); sentinel = true; } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('is-open'); }); });
  }
  function hide(fromPop) {
    if (!open) return;
    open = false;
    btn.setAttribute('aria-expanded', 'false');
    dlg.classList.remove('is-open');
    if (sentinel && !fromPop) { try { history.back(); } catch (e) {} sentinel = false; }
    try { dlg.close(); } catch (e) {}
    try { btn.focus({ preventScroll: true }); } catch (e) {}
  }
  btn.addEventListener('click', show);
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) hide();
  });
  dlg.addEventListener('close', function () {
    if (!open) return;
    open = false; sentinel = false;
    btn.setAttribute('aria-expanded', 'false');
    dlg.classList.remove('is-open');
  });
  G.addEventListener('popstate', function (e) {
    if (sentinel && !(e.state && e.state.sgxQp)) hide(true);
  });
  dlg.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-qp]') : null;
    if (!t) return;
    var id = t.getAttribute('data-qp');
    if (id === 'dark') setMode(mode() === 'dark' ? 'light' : 'dark');
    else if (id === 'system') setMode('system');
    else if (id === 'lang') {
      var cur = doc.documentElement.lang === 'en' ? 'en' : 'zh';
      setLang(cur === 'en' ? 'zh' : 'en');
    }
  });
})();
