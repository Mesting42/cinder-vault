# 《断誓之下》Cloudflare Pages 发布记录

应用构建为纯静态站点；Pages 托管 `dist/`，无需游戏服务器、数据库或常驻进程。

## 本地构建

需要 Node.js 22 或更新版本。执行 `npm ci` 后使用 `npm run build`。构建过程会运行 Vite，再从最终 HTML 生成 `dist/version.json`，供 `/version.json` 显示公开版本。

`public/_headers` 对入口 HTML 与版本清单禁用缓存，并为带内容哈希的应用代码、字体及音乐启用一年缓存。Pages 自动提供 HTTPS。配乐来源 / 授权说明与 `audio/music-manifest.json` 一同公开保存在构建目录内。

## Cloudflare Pages 直接上传

Cloudflare Pages 项目 `mest-oath` 已创建，并已发布 `main` 生产分支。`https://mest-oath.pages.dev/` 与本次部署地址均已实测返回 HTTP 200；公开版本接口返回构建 `5291e48385e0`。Wrangler 需要使用已登录的 Cloudflare 账户；不要把 API Token 存入游戏仓库。

```powershell
# 项目创建只需执行一次，当前项目已创建，不要重复执行
npm run cloudflare:project
# 后续发布新版本
npm run cloudflare:deploy
```

公开地址为 `https://mest-oath.pages.dev/`。本次不可变部署地址为 `https://b70c6718.mest-oath.pages.dev/`。若未来更改 Pages 项目名，应同步更新本文件与 `package.json`。

可使用 `npm run cloudflare:preview` 发布独立的 `preview` 分支预览地址。Wrangler 需要在首次发布前以用户自己的 Cloudflare 账户登录；不要把 API Token 存入游戏仓库。

## 手机方向与全屏

在常见触屏手机的竖屏状态下，先显示方向提示。用户点选“横屏并全屏开始”后，页面在浏览器允许时请求全屏并请求横屏锁定；横屏打开游戏时，首次点“开始深入 / 职业档案”也会发起同样的请求。全屏 / 方向锁都受浏览器用户手势与设备支持限制；失败时提示手动横屏或继续当前方向。设置 → 画面 → 全屏可退出全屏，代码同时解除屏幕方向锁。
