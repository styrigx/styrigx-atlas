// 图志根首页模板（sites/root/web/layouts）：Styrigx UI 外壳（顶栏九宫格 · 长条图志 · 快捷面板、导航抽屉同主站）、三张 One UI 卡片（整张可点）、中英两版。
// 只读模板源码，不用构建；构建后的行为在手机 E2E（tests/web/e2e/home.spec.js）。
// 运行：node --test tests/web/home.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(path.join(REPO, p), 'utf8');
const base = read('web/layouts/_default/baseof.html');
const index = read('web/layouts/index.html');

test('顶栏：九宫格 · 长条只显示图志 · 右圆快捷面板；没有分段滑块、分享按钮、搜索栏、头像', () => {
  assert.match(base, /class="sgx-tb-nav"/);
  assert.match(base, /<span class="sgx-tb-title">\{\{ if \$isEn \}\}Atlas\{\{ else \}\}图志\{\{ end \}\}<\/span>/);
  assert.match(base, /class="sgx-tb-end sgx-tb-qp" data-sgx-qp/);
  assert.doesNotMatch(base, /sgx-seg|sgx-tb-share|sgx-tb-quick|cu-search|sgx-tb-me|sgx-tb-avatar/);
});

test('抽屉：字标 + 头像 + 主站 / 三站 + 底栏搜索；没有当前项', () => {
  assert.match(base, /id="sgx-drawer"/);
  assert.match(base, /sgx-drawer-brand/);
  assert.match(base, /sgx-drawer-me/);
  assert.match(base, /sgx-drawer-search/);
  assert.doesNotMatch(base, /aria-current="page"/);
});

test('快捷面板：深色 / 跟随系统 / 语言三个开关 + 三站和主站链接', () => {
  assert.match(base, /id="sgx-qp"/);
  for (const id of ['dark', 'system', 'lang']) assert.match(base, new RegExp('data-qp="' + id + '"'), id);
  assert.match(base, /root-qp-links/);
});

test('首页：三张卡片整张可点，中文链 /<站>/、英文链 /<站>/en/，没有单独的 English 链接', () => {
  for (const s of ['blog', 'curio', 'daymark']) {
    assert.match(index, new RegExp('<a class="root-card" href="\\{\\{ if \\$isEn \\}\\}/' + s + '/en/\\{\\{ else \\}\\}/' + s + '/\\{\\{ end \\}\\}">'), s);
  }
  assert.doesNotMatch(index, /English →/);
});

test('外壳接线：读端内联 + 语言跟随 + 主题色引擎 + 顶栏和快捷面板脚本都指纹化', () => {
  assert.match(base, /js\/sgx\/shell\/ui-cookie-read\.js/);
  assert.match(base, /js\/sgx\/ui-inherit-run\.js/);
  assert.match(base, /data-sgx-accent-js/);
  assert.match(base, /js\/topbar\.js/);
  assert.match(base, /js\/sgx\/quick-panel\.js/);
  assert.match(base, /resources\.Get "css\/main\.css" \| minify \| fingerprint/);
});
