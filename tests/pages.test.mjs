// 图志 Pages（styrigx-atlas）：三站合成一个静态产物，整个域名共用的文件都在 root/
// - root/_worker.js：pages.dev 等非正式域名一律 301 回 atlas.styrigx.com；博客以外不出图片（奇趣、日刻的图片一律要过会话）
// - root/_headers：三站指纹化 /js/ /css/ 长期缓存；root/_redirects 只有 /favicon.ico → 主站头像
// - root/robots.txt：整个域名 Disallow: /；root/404.html：三站前缀外的地址
// - Pages 配置不带变量、钥匙、数据绑定；仓库里没有 Pages Functions
// - scripts/assemble.mjs：root/ + sites/<站>/web/public → public/<站>/，各站产物里不许有只该在根上的文件
// 运行：node --test tests/pages.test.mjs（最后一组要先 npm run build）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(REPO, p), 'utf8');
const src = read('root/_worker.js');
const tmp = path.join(mkdtempSync(path.join(tmpdir(), 'atlas-worker-')), '_worker.mjs');
writeFileSync(tmp, src);
const worker = (await import(pathToFileURL(tmp).href)).default;
const HOST = 'https://atlas.styrigx.com';
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 假的 ASSETS：按路径回不同的静态回答 */
function assetsWith(map) {
  return {
    fetch: async (req) => {
      const p = new URL(req.url).pathname;
      const hit = map[p];
      return hit ? hit() : new Response('static:' + p, { headers: { 'Content-Type': 'text/html' } });
    },
  };
}

test('pages.dev 生产别名、哈希预览别名、旧子域名都 301 回 atlas.styrigx.com，保留路径和查询串', async () => {
  for (const host of ['styrigx-atlas.pages.dev', 'abc123.styrigx-atlas.pages.dev', 'curio.styrigx.com']) {
    const res = await worker.fetch(new Request('https://' + host + '/curio/en/?x=1'), { ASSETS: assetsWith({}) });
    assert.equal(res.status, 301, host);
    assert.equal(res.headers.get('Location'), HOST + '/curio/en/?x=1');
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
  }
});

test('正式域名交给静态文件', async () => {
  for (const p of ['/blog/', '/curio/en/', '/daymark/']) {
    const res = await worker.fetch(new Request(HOST + p), { ASSETS: assetsWith({}) });
    assert.equal(await res.text(), 'static:' + p);
  }
});

test('奇趣、日刻和域名根：图片后缀一律 404（不管文件在不在、大小写、带查询串），不带图片字节、no-store', async () => {
  const assets = assetsWith({
    '/curio/a.png': () => new Response(PNG, { headers: { 'Content-Type': 'image/png' } }),
    '/daymark/img/b.SVG': () => new Response('<svg/>', { headers: { 'Content-Type': 'image/svg+xml' } }),
  });
  const paths = ['/curio/a.png', '/daymark/img/b.SVG', '/curio/a.png?v=1', '/x.jpg', '/og.png'];
  for (const ext of ['jpeg', 'webp', 'avif', 'gif', 'ico', 'bmp', 'heic', 'jxl', 'svgz']) paths.push('/curio/x.' + ext, '/daymark/x.' + ext);
  for (const p of paths) {
    const res = await worker.fetch(new Request(HOST + p), { ASSETS: assets });
    assert.equal(res.status, 404, p);
    assert.equal(res.headers.get('Cache-Control'), 'no-store', p);
    assert.doesNotMatch(res.headers.get('Content-Type') || '', /^image\//, p);
    assert.equal(await res.text(), 'not found', p);
  }
});

test('没有后缀但回答是 image/* 的也 404；字体、脚本照常', async () => {
  const assets = assetsWith({
    '/curio/blob': () => new Response(PNG, { headers: { 'Content-Type': 'image/png' } }),
    '/daymark/fonts/inter-latin.woff2': () => new Response('font', { headers: { 'Content-Type': 'font/woff2' } }),
  });
  assert.equal((await worker.fetch(new Request(HOST + '/curio/blob'), { ASSETS: assets })).status, 404);
  const font = await worker.fetch(new Request(HOST + '/daymark/fonts/inter-latin.woff2'), { ASSETS: assets });
  assert.equal(font.status, 200);
  assert.equal(await font.text(), 'font');
});

test('博客的图片照旧（/blog/og.png 是社交预览图）', async () => {
  const assets = assetsWith({ '/blog/og.png': () => new Response(PNG, { headers: { 'Content-Type': 'image/png' } }) });
  const res = await worker.fetch(new Request(HOST + '/blog/og.png'), { ASSETS: assets });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/png');
});

test('跳转原样放行：/favicon.ico 的 302（_redirects 跳主站头像），_redirects 只许这一条', async () => {
  const assets = assetsWith({
    '/favicon.ico': () => new Response(null, { status: 302, headers: { Location: 'https://styrigx.com/avatar/32.webp' } }),
  });
  const res = await worker.fetch(new Request(HOST + '/favicon.ico'), { ASSETS: assets });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), 'https://styrigx.com/avatar/32.webp');
  const lines = read('root/_redirects').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  assert.deepEqual(lines.map((l) => l.trim().split(/\s+/)), [['/favicon.ico', 'https://styrigx.com/avatar/32.webp', '302']]);
});

test('_headers：三站指纹化 /js/ /css/ 长期缓存，博客字体一周', () => {
  const h = read('root/_headers');
  for (const site of ['blog', 'curio', 'daymark']) {
    for (const dir of ['js', 'css']) {
      assert.match(h, new RegExp(`^/${site}/${dir}/\\*\\n  Cache-Control: public, max-age=31536000, immutable$`, 'm'), site + ' ' + dir);
    }
  }
  assert.match(h, /^\/blog\/fonts\/\*\n  Cache-Control: public, max-age=604800$/m);
});

test('robots.txt 整个域名 Disallow: /；404.html 不索引', () => {
  assert.equal(read('root/robots.txt'), 'User-agent: *\nDisallow: /\n');
  assert.match(read('root/404.html'), /<meta name="robots" content="noindex">/);
});

test('Pages 零钥匙：没有 functions/，配置没有变量和绑定，_worker.js 不验签', () => {
  for (const d of ['functions', 'root/functions', ...['blog', 'curio', 'daymark'].map((s) => `sites/${s}/web/functions`)]) {
    assert.equal(existsSync(path.join(REPO, d)), false, d);
  }
  const toml = read('wrangler.toml');
  assert.match(toml, /^name = "styrigx-atlas"$/m);
  assert.match(toml, /^pages_build_output_dir = "public"$/m);
  assert.doesNotMatch(toml, /^\[|SGX_/m);
  assert.doesNotMatch(src, /SGX_|sgx-lock-session|crypto\.subtle/);
  /* 各站不再带自己的 Pages 配置和根文件 */
  for (const site of ['blog', 'curio', 'daymark']) {
    for (const f of ['web/wrangler.toml', 'web/static/_worker.js', 'web/static/_headers', 'web/static/_redirects', 'web/static/robots.txt']) {
      assert.equal(existsSync(path.join(REPO, 'sites', site, f)), false, site + '/' + f);
    }
  }
});

test('奇趣、日刻的 web/ 里没有图片文件（Pages 不出图片；图片只能走接口 Worker 的 /<站>/api/*，先验会话）', () => {
  const IMG = /\.(png|apng|jpe?g|jfif|pjpeg|pjp|gif|webp|avif|svgz?|ico|cur|bmp|tiff?|heic|heif|jxl)$/i;
  const skip = new Set(['public', 'resources', 'node_modules']);
  const bad = [];
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (!skip.has(e.name)) walk(path.join(dir, e.name), rel + e.name + '/'); }
      else if (IMG.test(e.name)) bad.push(rel + e.name);
    }
  };
  for (const site of ['curio', 'daymark']) walk(path.join(REPO, 'sites', site, 'web'), `sites/${site}/web/`);
  assert.deepEqual(bad, []);
});

test('各站 baseURL 都是 https://atlas.styrigx.com/<站>/', () => {
  for (const site of ['blog', 'curio', 'daymark']) {
    assert.match(read(`sites/${site}/web/hugo.yaml`), new RegExp(`^baseURL: 'https://atlas\\.styrigx\\.com/${site}/'$`, 'm'), site);
  }
});

test('接口 Worker 只挂图志下本站的 /api/*', () => {
  for (const site of ['curio', 'daymark']) {
    const t = read(`sites/${site}/workers/core/wrangler.toml`);
    assert.deepEqual([...t.matchAll(/^pattern = "([^"]+)"$/gm)].map((m) => m[1]), [`atlas.styrigx.com/${site}/api/*`], site);
  }
});

test('assemble：root/ 在根上，三站 + 根站首页在对应位置；站内产物带了根文件就报错', async () => {
  const { assemble } = await import(pathToFileURL(path.join(REPO, 'scripts/assemble.mjs')).href);
  const built = ['blog', 'curio', 'daymark', 'root'].every((s) => existsSync(path.join(REPO, 'sites', s, 'web/public/index.html')));
  if (!built) return; // 没构建（只跑单测）时跳过；CI 先 npm run build
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'atlas-public-')), 'public');
  assemble(out);
  for (const f of ['_worker.js', '_headers', '_redirects', 'robots.txt', '404.html']) assert.ok(existsSync(path.join(out, f)), f);
  for (const s of ['blog', 'curio', 'daymark']) {
    assert.ok(existsSync(path.join(out, s, 'index.html')), s);
    assert.ok(existsSync(path.join(out, s, 'en/index.html')), s + ' en');
    assert.ok(existsSync(path.join(out, s, '404.html')), s + ' 404');
  }
  /* 域名根首页来自根站 Hugo 构建：/ 和 /en/ 都有，三个站的入口都在上面，不链到 /root/ */
  const home = readFileSync(path.join(out, 'index.html'), 'utf8');
  const homeEn = readFileSync(path.join(out, 'en', 'index.html'), 'utf8');
  for (const s of ['blog', 'curio', 'daymark']) {
    assert.match(home, new RegExp('href=["\']?/' + s + '/'), '首页缺 ' + s);
    assert.match(homeEn, new RegExp('href=["\']?/' + s + '/en/'), '英文首页缺 ' + s);
  }
  assert.doesNotMatch(home, /href=["']?\/root\//, '首页不该链到 /root/');
  /* 页面里的站内地址都带本站前缀 */
  for (const s of ['blog', 'curio', 'daymark']) {
    const html = readFileSync(path.join(out, s, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:href|src)="?(\/[^"\s>]*)/g)].map((m) => m[1]);
    assert.ok(refs.length > 3, s);
    assert.deepEqual(refs.filter((r) => !r.startsWith('/' + s + '/')), [], s);
  }
  /* 站内产物里混进根文件 → 报错 */
  const blogPub = path.join(REPO, 'sites/blog/web/public');
  const stray = path.join(blogPub, '_redirects');
  writeFileSync(stray, '');
  try {
    assert.throws(() => assemble(out), /只该在域名根上的文件/);
  } finally {
    (await import('node:fs')).rmSync(stray);
  }
});
