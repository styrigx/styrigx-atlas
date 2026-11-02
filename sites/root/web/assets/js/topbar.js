/**
 * 顶栏（图志根站）：只管导航抽屉。
 * - 抽屉（#sgx-drawer，<dialog> 模态）：九宫格打开；点遮罩 / 系统返回 / Esc 关闭。
 *   打开时 push 一条同 URL 的历史哨兵，系统返回只关抽屉不离开页面；点抽屉里任何一项都是关完再跳转（根站没有当前项）。
 */
(function () {
  var doc = document, G = window;
  function reduced() {
    return doc.documentElement.classList.contains('reduced-motion') ||
      !!(G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ---------- 导航抽屉 ---------- */
  (function () {
    var btn = doc.querySelector('.sgx-tb-nav');
    var dlg = doc.getElementById('sgx-drawer');
    if (!btn || !dlg || typeof dlg.showModal !== 'function') return;
    var MS = 220, open = false, sentinel = false, timer = 0, after = null;

    function show() {
      if (open) return;
      open = true; clearTimeout(timer);
      try { dlg.showModal(); } catch (e) { open = false; return; }
      btn.setAttribute('aria-expanded', 'true');
      try { history.pushState({ sgxDrawer: 1 }, ''); sentinel = true; } catch (e) {}
      requestAnimationFrame(function () { requestAnimationFrame(function () { dlg.classList.add('is-open'); }); });
    }
    function finish() {
      try { dlg.close(); } catch (e) {}
      var fn = after; after = null;
      if (fn) fn();
      else { try { btn.focus({ preventScroll: true }); } catch (e) {} }
    }
    /* fromPop：系统返回触发（哨兵已出栈）；否则自己把哨兵退掉 */
    function hide(fn, fromPop) {
      if (!open) return;
      open = false; after = fn || null;
      btn.setAttribute('aria-expanded', 'false');
      dlg.classList.remove('is-open');
      if (sentinel && !fromPop) { try { history.back(); } catch (e) {} sentinel = false; }
      if (reduced()) finish();
      else { clearTimeout(timer); timer = setTimeout(finish, MS); }
    }
    btn.addEventListener('click', show);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) hide();
    });
    dlg.addEventListener('close', function () {
      if (!open) return;
      open = false; after = null; sentinel = false;
      btn.setAttribute('aria-expanded', 'false');
      dlg.classList.remove('is-open');
    });
    G.addEventListener('popstate', function (e) {
      if (sentinel && !(e.state && e.state.sgxDrawer)) hide(null, true);
    });
    /* 抽屉里的链接：关完再跳转 */
    dlg.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      e.preventDefault();
      var href = a.getAttribute('href');
      hide(function () { G.location.href = href; });
    });
  })();
})();
