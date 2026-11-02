// 图志根首页（手机）：顶栏、抽屉、三个入口、深色。
// - 顶栏：九宫格 · 长条只显示图志 · 右圆快捷面板；没有分段滑块和分享按钮
// - 抽屉：九宫格打开，字标 + 头像、主站 / 奇趣 / 日刻 / 博客、底栏搜索；没有当前项；抽屉里的绝对地址只断言 href，不真跳（会离站）
// - 三个入口：三张卡片整张可点，中文链 /blog/、/curio/、/daymark/，英文页链 /blog/en/、/curio/en/、/daymark/en/；点博客卡真跳到 /blog/ 再回来
// - 深色：sgx-ui cookie 写 mode dark，<html> 落 dark class；快捷面板的深色开关 aria-pressed 为 true
const { test, expect } = require('@playwright/test');

const enc = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
const DARK_ZH = enc({ v: 2, mode: 'dark', lang: 'zh' });

test('顶栏：九宫格 · 长条只显示图志 · 右圆快捷面板；三个入口都在', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sgx-tb-nav')).toBeVisible();
  await expect(page.locator('.sgx-tb-title')).toHaveText('图志');
  await expect(page.locator('[data-sgx-qp]')).toBeVisible();
  await expect(page.locator('.sgx-seg')).toHaveCount(0);
  await expect(page.locator('.sgx-tb-share')).toHaveCount(0);
  const cards = page.locator('.root-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toHaveAttribute('href', '/blog/');
  await expect(cards.nth(1)).toHaveAttribute('href', '/curio/');
  await expect(cards.nth(2)).toHaveAttribute('href', '/daymark/');
  await expect(cards.nth(0)).toContainText('博客');
  await expect(cards.nth(1)).toContainText('奇趣');
  await expect(cards.nth(2)).toContainText('日刻');
});

test('抽屉：九宫格打开，字标 + 头像、主站 / 奇趣 / 日刻 / 博客、底栏搜索；没有当前项', async ({ page }) => {
  await page.goto('/');
  await page.locator('.sgx-tb-nav').click();
  const drawer = page.locator('#sgx-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.sgx-drawer-brand')).toBeVisible();
  await expect(drawer.locator('.sgx-drawer-me')).toHaveAttribute('href', 'https://styrigx.com/account/');
  const items = drawer.locator('.sgx-drawer-item');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toHaveAttribute('href', 'https://styrigx.com/');
  await expect(items.nth(1)).toHaveAttribute('href', 'https://atlas.styrigx.com/curio/');
  await expect(items.nth(2)).toHaveAttribute('href', 'https://atlas.styrigx.com/daymark/');
  await expect(items.nth(3)).toHaveAttribute('href', 'https://atlas.styrigx.com/blog/');
  await expect(drawer.locator('[aria-current="page"]')).toHaveCount(0);
  await expect(drawer.locator('.sgx-drawer-search')).toHaveAttribute('href', 'https://styrigx.com/search/');
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

test('英文页：长条 Atlas，三张卡链 /<站>/en/，抽屉和快捷面板也是英文', async ({ page }) => {
  await page.goto('/en/');
  await expect(page.locator('.sgx-tb-title')).toHaveText('Atlas');
  const cards = page.locator('.root-card');
  await expect(cards.nth(0)).toHaveAttribute('href', '/blog/en/');
  await expect(cards.nth(1)).toHaveAttribute('href', '/curio/en/');
  await expect(cards.nth(2)).toHaveAttribute('href', '/daymark/en/');
  await expect(cards.nth(0)).toContainText('Blog');
  await page.locator('.sgx-tb-nav').click();
  const drawer = page.locator('#sgx-drawer');
  await expect(drawer.locator('.sgx-drawer-me')).toHaveAttribute('href', 'https://styrigx.com/en/account/');
  await expect(drawer.locator('.sgx-drawer-item').nth(0)).toHaveAttribute('href', 'https://styrigx.com/en/');
});

test('点博客卡真跳到 /blog/ 再回来', async ({ page }) => {
  await page.goto('/');
  await page.locator('.root-card').nth(0).click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.root-card')).toHaveCount(3);
});

test('深色：cookie mode dark，<html> 落 dark class；快捷面板深色开关为开', async ({ page, context }) => {
  await context.addCookies([{ name: 'sgx-ui', value: DARK_ZH, url: 'http://localhost:8932' }]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.locator('[data-sgx-qp]').click();
  const panel = page.locator('#sgx-qp');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-qp="dark"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.locator('[data-qp="system"]')).toHaveAttribute('aria-pressed', 'false');
});
