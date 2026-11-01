/* 手机 E2E 配置：只做功能断言，不做截图比对。
 * 设备：Chromium，412×915 / 360×800，
 * deviceScaleFactor 2.625，isMobile + hasTouch。
 *
 * 先在仓库根 npm run build（三站构建 + scripts/assemble.mjs 合成 public/），这里起模拟图志 Pages 的静态服务器（仓库根 scripts/serve-static.mjs），
 * 本站在 /daymark/ 下（测试里的地址都带 /daymark 前缀）。CI 见仓库根 .github/workflows/deploy.yml。
 */
const { defineConfig } = require('@playwright/test');

const PHONE = { deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };

module.exports = defineConfig({
  testDir: '../web/e2e',
  testMatch: ['*.spec.js'],
  projects: [
    {
      name: 'phone-412',
      use: { browserName: 'chromium', viewport: { width: 412, height: 915 }, ...PHONE },
    },
    {
      name: 'phone-360',
      use: { browserName: 'chromium', viewport: { width: 360, height: 800 }, ...PHONE },
    },
  ],
  webServer: {
    command: 'node ../../../../scripts/serve-static.mjs ../../../../public 8932',
    port: 8932,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:8932',
    timezoneId: 'Asia/Shanghai',
  },
  reporter: [['list']],
  timeout: 60000,
});
