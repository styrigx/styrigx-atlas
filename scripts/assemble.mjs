#!/usr/bin/env node
/**
 * 把三站各自的 Hugo 产物合成图志的单一 Pages 产物 public/：
 *   root/*                     → public/（_worker.js、_headers、_redirects、robots.txt、404.html：整个域名共用）
 *   sites/<站>/web/public/*    → public/<站>/（blog、curio、daymark；各站 baseURL 已是 https://atlas.styrigx.com/<站>/）
 * 各站产物里不许再有 Pages 专用文件（_worker.js / _headers / _redirects / robots.txt）：它们只在域名根上生效，放在子目录里是死文件。
 * 用法：node scripts/assemble.mjs [输出目录=public]（先跑各站构建：npm run build -ws）
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SITES = ['blog', 'curio', 'daymark'];
export const ROOT_ONLY = ['_worker.js', '_headers', '_redirects', 'robots.txt'];

export function assemble(out = path.join(REPO, 'public')) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(path.join(REPO, 'root'), out, { recursive: true });
  for (const site of SITES) {
    const src = path.join(REPO, 'sites', site, 'web', 'public');
    if (!existsSync(path.join(src, 'index.html'))) throw new Error(`assemble：${site} 还没构建（缺 sites/${site}/web/public/index.html）`);
    const stray = readdirSync(src).filter((n) => ROOT_ONLY.includes(n));
    if (stray.length) throw new Error(`assemble：${site} 的产物里有只该在域名根上的文件：${stray.join('、')}`);
    cpSync(src, path.join(out, site), { recursive: true });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = assemble(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log('assembled ' + path.relative(REPO, out) + '/ ← root/ + ' + SITES.map((s) => s + '/').join(' '));
}
