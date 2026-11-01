# styrigx-atlas · 图志

图志：博客、奇趣、日刻。一个仓库、一个域名 **atlas.styrigx.com**，三站各占一个子路径：

| 站 | 地址 | 内容 | 后端 |
|---|---|---|---|
| 博客 | `https://atlas.styrigx.com/blog/`（英文 `/blog/en/`） | Hugo 静态文章，RSS、站点地图 | 无（全站搜索索引 `site:blog` 由 CI 写 KV） |
| 奇趣 | `https://atlas.styrigx.com/curio/`（英文 `/curio/en/`） | 收藏、设备、游戏 | Worker `styrigx-curio-core`，路由 `atlas.styrigx.com/curio/api/*`，D1 + R2 |
| 日刻 | `https://atlas.styrigx.com/daymark/`（英文 `/daymark/en/`） | 句子、今日一句 | Worker `styrigx-daymark-core`，路由 `atlas.styrigx.com/daymark/api/*`，D1 |

技术栈同主站 styrigx-space：Hugo + Tailwind 4，Cloudflare Pages（只放静态文件）+ Workers。页面的锁屏会话检查全在主站鉴权网关 `styrigx-auth-gateway`，本仓库不持任何钥匙。

## 目录

```
styrigx-atlas/
├─ sites/
│  ├─ blog/       博客（web/ = Hugo 站点；scripts/ 构建 CSS、搜索索引、代码配色；tests/）
│  ├─ curio/      奇趣（web/；workers/core/ 接口 Worker；data/ 初始收藏；tests/）—— 见 sites/curio/STRUCTURE.md
│  └─ daymark/    日刻（web/；workers/core/ 接口 Worker；tests/）—— 见 sites/daymark/STRUCTURE.md
├─ root/          整个域名共用、只在根上生效的 Pages 文件：_worker.js、_headers、_redirects、robots.txt、404.html
├─ scripts/       assemble.mjs（合成 public/）、serve-static.mjs（本地 / CI 模拟 Pages）
├─ tests/         根测试：Pages 根文件、合成产物
├─ wrangler.toml  Pages 项目 styrigx-atlas（不带变量、钥匙、绑定）
├─ package.json   npm workspaces（三站共用一份依赖和 lockfile）
└─ .github/       CI（deploy.yml、update-snapshots.yml）、dependabot
```

## 本地

```bash
npm ci
npm run build        # 三站各自 Tailwind + Hugo（sites/<站>/web/public/）→ scripts/assemble.mjs 合成 public/
npm test             # 根测试 + 三站单测（接口 Worker 用 node:sqlite 真跑 SQL，Node 22）
npm run test:e2e     # 对着合成后的 public/ 跑：博客行为 + 视觉回归、奇趣 / 日刻手机 E2E
npm run shell:check  # 三站的主站共享外壳副本和锁定的主站提交一致
```

单站：`npm run build -w sites/curio`、`npm test -w sites/daymark`；本地预览合成产物：`node scripts/serve-static.mjs public 4321` 后打开 `http://localhost:4321/blog/`。

`public/` 的样子：根上是 `root/` 的文件，`public/blog/`、`public/curio/`、`public/daymark/` 是三站产物。各站 Hugo 的 baseURL 都是 `https://atlas.styrigx.com/<站>/`，所以页面、资源、站内链接都带前缀；域名根 `/` 没有首页（404）。

## 路由约定（主站网关和本仓库一起认的）

| 路径 | 谁回答 |
|---|---|
| `atlas.styrigx.com/blog/*`、`/curio/*`、`/daymark/*` 页面 | 主站鉴权网关验会话后回源本 Pages |
| `atlas.styrigx.com/curio/api/*` | `styrigx-curio-core`（比网关的页面路由更精确） |
| `atlas.styrigx.com/daymark/api/*` | `styrigx-daymark-core`（`GET /daymark/api/today` 公开，CORS 只给 `https://styrigx.com`） |
| `atlas.styrigx.com/api/lock-session-check` | 主站鉴权网关（三站切回前台复查会话） |
| `atlas.styrigx.com/api/search` | 主站鉴权网关 → styrigx-search-index（三站的原地搜索层） |

Pages 的 `styrigx-atlas.pages.dev` 和每次部署的预览地址不经网关，`root/_worker.js` 一律 301 回 `atlas.styrigx.com`；`/blog/` 以外像图片的回答一律 404（奇趣、日刻的图片只从接口 Worker 出，先验会话）。

旧的 `blog.styrigx.com`、`curio.styrigx.com`、`daymark.styrigx.com` 不做跳转，直接停用。

## 部署（CI，`.github/workflows/deploy.yml`）

PR：构建、单测、两个接口 Worker 的 dry-run 打包、Playwright（博客视觉基线只在 CI 生成，变了就在分支上手动跑 `Update visual snapshots`）。

main 推送：`build-and-deploy` → `gate`（`atlas.styrigx.com` 解析了就要求三站首页由网关回 302、`/api/lock-session-check` 由网关回 401；没解析放行）→ `deploy-curio-core` / `deploy-daymark-core`（D1 迁移 + 部署）→ `deploy-pages`（Pages + 博客 KV 索引 + 冒烟）。

| 密钥 | 放哪 | 用途 |
|---|---|---|
| `STYRIGX_ATLAS_PAGES_DEPLOY` | 仓库级 | Pages `styrigx-atlas` 部署 + KV `styrigx-search-index` 写 `site:blog` |
| `STYRIGX_CURIO_CORE_DEPLOY` | 环境 `STYRIGX_CURIO_CORE_DEPLOY`（只允许 main） | 奇趣 core 的 D1 迁移 + 部署 |
| `STYRIGX_DAYMARK_CORE_DEPLOY` | 环境 `STYRIGX_DAYMARK_CORE_DEPLOY`（只允许 main） | 日刻 core 的 D1 迁移 + 部署 |
| `CLOUDFLARE_ACCOUNT_ID` | 仓库级 | 不是钥匙 |

D1、R2、KV、Worker 名字都沿用原来的（`styrigx-curio-core`、`styrigx-daymark-core`），本仓库只换了代码位置和路由。

## 历史

2026-11 由 styrigx-blog、styrigx-curio、styrigx-daymark 三个仓库合并而来（旧仓库归档）。

## License

MIT，见 LICENSE。
