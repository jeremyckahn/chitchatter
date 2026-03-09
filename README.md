# 畅聊 (Chitchatter)

一款免费、开源、去中心化的点对点加密聊天应用。所有通讯端到端加密，离开即消失，不留痕迹。

## 功能特性

- **端到端加密** — 所有消息通过 WebRTC 直接在对等方之间传输，端到端加密
- **去中心化** — 无中心服务器存储消息，信令通过 Cloudflare Durable Objects 实现
- **即时消失** — 所有人离开房间后，对话历史自动消失
- **多人聊天** — 支持多人同时在线聊天
- **音视频通话** — 支持语音和视频通话
- **屏幕共享** — 可以与房间内的人共享屏幕
- **文件传输** — 加密文件共享
- **私密房间** — 支持密码保护的私密房间
- **身份验证** — 使用公钥加密技术验证对等方身份
- **Markdown** — 消息支持 Markdown 格式和代码语法高亮
- **PWA** — 可安装为渐进式 Web 应用
- **多语言** — 支持中文和英文界面
- **暗色主题** — 支持亮色/暗色主题切换

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Realtime 生态              │
│                                                         │
│  ┌──────────────┐    ┌────────────────────────────┐     │
│  │ Cloudflare   │    │  Cloudflare Workers         │     │
│  │ Pages        │    │  ┌──────────────────────┐  │     │
│  │ (前端托管)    │    │  │ Durable Objects      │  │     │
│  │              │    │  │ (信令服务器)          │  │     │
│  └──────────────┘    │  └──────────────────────┘  │     │
│                      │  ┌──────────────────────┐  │     │
│                      │  │ Realtime TURN        │  │     │
│                      │  │ (NAT穿透/中继)       │  │     │
│                      │  └──────────────────────┘  │     │
│                      │  ┌──────────────────────┐  │     │
│                      │  │ Realtime SFU         │  │     │
│                      │  │ (多人音视频转发)      │  │     │
│                      │  └──────────────────────┘  │     │
│                      └────────────────────────────┘     │
│                                                         │
│  文字聊天: P2P 数据通道（端到端加密）                      │
│  音视频:   Cloudflare SFU 转发（多人场景高效）             │
│  NAT穿透:  Cloudflare TURN 中继（复杂网络保障）           │
└─────────────────────────────────────────────────────────┘
```

- **前端**: React 18 + TypeScript + Vite + Material UI
- **信令**: Cloudflare Durable Objects (WebSocket)
- **文字**: 原生 WebRTC P2P 数据通道（端到端加密）
- **音视频**: Cloudflare Realtime SFU（多人高效转发）
- **穿透**: Cloudflare TURN（STUN/TURN 全球中继）
- **部署**: Cloudflare Pages + Workers + Realtime

## 快速开始

### 前置条件

- [Node.js](https://nodejs.org/) 20.x
- npm 10.x
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)（免费即可）
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 本地开发

1. **克隆项目**

```bash
git clone <your-repo-url>
cd chitchatter
```

2. **安装依赖**

```bash
npm install
cd worker && npm install && cd ..
```

3. **启动开发环境**

```bash
npm run dev
```

这会同时启动：

- Vite 开发服务器（端口 3000）
- Cloudflare Worker 本地开发服务器（端口 8787）
- StreamSaver 服务（端口 3015）

4. **访问应用**

打开浏览器访问 http://localhost:3000

### 运行测试

```bash
# 单元测试
npm test

# 类型检查
npm run check:types

# 代码检查
npm run lint

# 格式化
npm run prettier
```

## 部署到 Cloudflare

### 第一步：部署信令服务器（Worker + Durable Object）

1. **登录 Cloudflare**

```bash
cd worker
npx wrangler login
```

2. **修改 Worker 名称**（可选）

编辑 `worker/wrangler.toml`，修改 `name` 字段：

```toml
name = "your-app-signaling"
```

3. **部署 Worker**

```bash
cd worker
npx wrangler deploy
```

部署成功后，终端会输出 Worker URL，例如：

```
https://your-app-signaling.your-subdomain.workers.dev
```

**记下这个 URL**，后续配置前端需要用到。

4. **配置 Cloudflare TURN 中继**（推荐，增强连接性）

TURN 中继让处于严格防火墙/NAT 后的用户也能连接。Cloudflare 提供原生 TURN 服务（1000GB/月免费）：

**a. 创建 TURN Key：**

- 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
- 进入 "Calls" → "TURN Keys" → "Create"
- 记下生成的 **Key ID** 和 **API Token**

**b. 将密钥设置到 Worker：**

```bash
cd worker
npx wrangler secret put TURN_KEY_ID
# 粘贴你的 TURN Key ID

npx wrangler secret put TURN_KEY_API_TOKEN
# 粘贴你的 TURN API Token
```

这样 Worker 会自动为每个用户生成短期 TURN 凭证（24 小时过期），完全使用 Cloudflare 全球网络中继，无需任何外部 TURN 服务器。

5. **配置 CORS**（生产环境）

编辑 `worker/src/index.ts` 中的 `allowedOrigins` 数组，添加你的前端域名：

```typescript
const allowedOrigins = [
  'https://your-domain.com',
  'https://your-app.pages.dev',
  'http://localhost:3000',
]
```

然后重新部署：

```bash
npx wrangler deploy
```

### 第二步：部署前端到 Cloudflare Pages

#### 方法 A：通过 Cloudflare Dashboard（推荐）

1. **将代码推送到 GitHub/GitLab**

2. **登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)**

3. **创建 Pages 项目**
   - 进入 "Workers & Pages" → "创建应用程序" → "Pages" → "连接 Git"
   - 选择你的仓库

4. **配置构建设置**
   - 构建命令：`npm run build:app`
   - 构建输出目录：`dist`
   - Node.js 版本：`20`

5. **设置环境变量**
   - `VITE_SIGNALING_SERVER_URL` = `wss://your-app-signaling.your-subdomain.workers.dev`（第一步获得的 Worker URL，将 `https://` 替换为 `wss://`）
   - `VITE_RTC_CONFIG_ENDPOINT` = `https://your-app-signaling.your-subdomain.workers.dev/api/get-config`（如果配置了 TURN）

6. **点击部署**

#### 方法 B：通过命令行

1. **设置环境变量**

```bash
export VITE_SIGNALING_SERVER_URL="wss://your-app-signaling.your-subdomain.workers.dev"
```

2. **构建前端**

```bash
npm run build:app
```

3. **部署到 Pages**

```bash
npx wrangler pages deploy dist --project-name=your-app-name
```

### 第三步：配置自定义域名（可选）

1. 在 Cloudflare Dashboard 的 Pages 项目设置中添加自定义域名
2. 配置 DNS 记录指向 Cloudflare Pages
3. 更新 Worker 的 `allowedOrigins` 包含新域名
4. 重新部署 Worker

### 部署验证

部署完成后，进行以下验证：

1. **信令服务器连通性**
   - 访问 `https://your-worker.workers.dev/api/get-config`，应返回 TURN 配置或 404
2. **前端可用性**
   - 访问前端 URL，应正常显示聊天界面

3. **P2P 连接测试**
   - 打开两个浏览器标签，进入同一房间
   - 确认双方能看到对方在线并能发送消息

## 环境变量

### 前端（Vite）

| 变量                        | 说明                             | 示例                                                |
| --------------------------- | -------------------------------- | --------------------------------------------------- |
| `VITE_SIGNALING_SERVER_URL` | 信令服务器 WebSocket URL         | `wss://signal.example.workers.dev`                  |
| `VITE_RTC_CONFIG_ENDPOINT`  | TURN 配置 API 端点               | `https://signal.example.workers.dev/api/get-config` |
| `VITE_HOMEPAGE`             | 应用首页 URL                     | `https://your-domain.com`                           |
| `VITE_STREAMSAVER_URL`      | StreamSaver MITM URL             | `https://your-domain.com/mitm.html`                 |
| `VITE_TRACKER_URL`          | WebTorrent Tracker（文件传输用） | `ws://localhost:8000`                               |
| `VITE_ROUTER_TYPE`          | 路由模式                         | `browser` 或 `hash`                                 |

### Worker

| 变量                 | 说明                      | 设置方式                                 |
| -------------------- | ------------------------- | ---------------------------------------- |
| `TURN_KEY_ID`        | Cloudflare TURN Key ID    | `wrangler secret put TURN_KEY_ID`        |
| `TURN_KEY_API_TOKEN` | Cloudflare TURN API Token | `wrangler secret put TURN_KEY_API_TOKEN` |
| `CORS_ALLOW_ALL`     | 调试模式允许所有来源      | `wrangler.toml` 中设置                   |

## 费用估算

| 服务               | 免费额度                | 超出费用             |
| ------------------ | ----------------------- | -------------------- |
| Cloudflare Pages   | 无限站点，500 次构建/月 | 付费计划更多构建次数 |
| Cloudflare Workers | 10 万请求/天            | $0.30/百万请求       |
| Durable Objects    | 100 万请求/月           | $0.15/百万请求       |
| 带宽               | 无限                    | 无限                 |

**对于中小规模使用，完全在免费额度内运行。**

## 项目结构

```
chitchatter/
├── worker/                 # Cloudflare Worker（信令服务器）
│   ├── src/
│   │   ├── index.ts        # Worker 入口，路由处理
│   │   ├── SignalingRoom.ts # Durable Object 信令房间
│   │   └── rtc-types.ts    # RTC 类型定义
│   ├── wrangler.toml       # Worker 部署配置
│   └── package.json
├── src/
│   ├── components/         # React 组件
│   ├── config/             # 应用配置
│   ├── contexts/           # React 上下文
│   ├── hooks/              # 自定义 Hooks
│   ├── i18n/               # 国际化
│   │   ├── index.ts        # i18n 配置
│   │   └── locales/        # 翻译文件
│   │       ├── zh-CN.json  # 中文翻译
│   │       └── en.json     # 英文翻译
│   ├── lib/                # 核心库
│   │   ├── PeerRoom/       # P2P 房间管理（WebRTC + 信令）
│   │   └── ConnectionTest/ # 连接测试
│   ├── models/             # 类型定义
│   ├── pages/              # 页面组件
│   └── services/           # 服务层
├── e2e/                    # 端到端测试（Playwright）
├── sdk/                    # 可嵌入 SDK
├── index.html              # HTML 入口
├── vite.config.ts          # Vite 构建配置
└── package.json
```

## 常见问题

### 对等方无法连接？

1. 确认双方都能访问信令服务器
2. 检查浏览器是否支持 WebRTC
3. 如果在严格的 NAT 环境下，需要配置 TURN 服务器
4. 尝试禁用广告拦截器
5. 尝试使用其他网络

### iOS Safari 问题

iOS Safari 在特定条件下可能有 WebRTC 限制。建议使用 Chrome 或 Firefox。

### 文件下载问题

大文件下载可能需要 Service Worker 支持。确保应用通过 HTTPS 访问。

## 开源协议

[GPL v2](LICENSE)

## 贡献

欢迎提交 Pull Request 和 Issue。请确保：

1. 代码通过 `npm run check:types`（零类型错误）
2. 代码通过 `npm run lint`（零警告）
3. 所有测试通过 `npm test`
4. 代码已格式化 `npm run prettier`
5. 新功能包含测试覆盖
