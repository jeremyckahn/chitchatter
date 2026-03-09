# 畅聊 (Chitchatter)

<p align="center">
  <strong>🔒 安全的点对点加密聊天应用 | Secure P2P Encrypted Chat</strong>
</p>

<p align="center">
  <a href="https://chat.cn9.eu">在线体验 Live Demo</a> ·
  <a href="#english">English</a> ·
  <a href="#部署指南">部署指南</a> ·
  <a href="#技术原理详解">技术原理</a>
</p>

<p align="center">
  <a href="https://github.com/Shannon-x/chitchatter/stargazers"><img src="https://img.shields.io/github/stars/Shannon-x/chitchatter?style=social" alt="Stars"></a>
  <a href="https://github.com/Shannon-x/chitchatter/blob/develop/LICENSE"><img src="https://img.shields.io/github/license/Shannon-x/chitchatter" alt="License"></a>
  <a href="https://chat.cn9.eu"><img src="https://img.shields.io/badge/demo-chat.cn9.eu-blue" alt="Demo"></a>
</p>

<p align="center">
  <a href="https://star-history.com/#Shannon-x/chitchatter&Date">
    <img src="https://api.star-history.com/svg?repos=Shannon-x/chitchatter&type=Date" width="600" alt="Star History Chart">
  </a>
</p>

---

一款免费、开源、去中心化的点对点加密聊天应用。所有通讯端到端加密，离开即消失，不留痕迹。完全运行在 Cloudflare 生态，零外部依赖。

## 功能特性

| 功能          | 说明                                    |
| ------------- | --------------------------------------- |
| 🔐 端到端加密 | 文字消息通过 WebRTC P2P 直连，DTLS 加密 |
| 🌐 去中心化   | 无中心服务器存储消息                    |
| 💨 即时消失   | 所有人离开房间后，对话历史自动消失      |
| 👥 多人聊天   | 支持多人同时在线                        |
| 📹 音视频通话 | 通过 Cloudflare SFU 高效转发            |
| 🖥️ 屏幕共享   | 与房间内的人共享屏幕                    |
| 📁 文件传输   | 通过 P2P 加密通道直接传输               |
| 🔑 私密房间   | 密码保护                                |
| ✅ 身份验证   | 公钥加密验证                            |
| 📝 Markdown   | 消息支持 Markdown 和代码高亮            |
| 📱 PWA        | 可安装为桌面/手机应用                   |
| 🌍 多语言     | 中文/英文一键切换                       |
| 🌙 暗色主题   | 亮色/暗色切换                           |

---

## 技术原理详解

### 整体架构

本项目完全运行在 Cloudflare 生态中，使用了 5 项 Cloudflare 服务：

```
用户 A 的浏览器                                    用户 B 的浏览器
     │                                                  │
     │  ① 加载前端页面                                    │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Pages（前端托管，全球 CDN）                        │
│  托管 HTML/JS/CSS 静态文件，用户从最近的节点加载               │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ② 建立 WebSocket 连接到信令服务器                    │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Worker + Durable Object（信令服务器）              │
│                                                             │
│  每个聊天房间 = 一个 Durable Object 实例                      │
│  职责：                                                      │
│    - 维护房间内所有在线用户的 WebSocket 连接                    │
│    - 当新用户加入时，通知房间内其他人                            │
│    - 转发 SDP offer/answer（WebRTC 连接参数）                  │
│    - 转发 ICE candidate（网络地址候选）                        │
│    - 用户离开时通知其他人                                      │
│                                                             │
│  注意：信令服务器只传递连接参数，不传递实际消息内容               │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ③ 交换连接参数后，建立直连                           │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  WebRTC P2P 直连（文字聊天 + 文件传输）                        │
│                                                             │
│  用户 A ◄══════════ 数据通道（加密）══════════► 用户 B        │
│                                                             │
│  - 消息直接在浏览器之间传输，不经过任何服务器                    │
│  - DTLS 加密，即使信令服务器被攻破也无法解密消息                │
│  - 支持发送文本、表情、Markdown、图片、文件                    │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ④ 音视频通过 SFU 转发（多人高效）                     │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Realtime SFU（选择性转发单元）                     │
│                                                             │
│  用户 A ──上传 1 路视频──► SFU ──转发──► 用户 B              │
│                              │──转发──► 用户 C              │
│                              │──转发──► 用户 D              │
│                                                             │
│  P2P: 5人视频 = 每人上传4路 = 20路总流量                      │
│  SFU: 5人视频 = 每人上传1路 = 5路上传 + SFU转发               │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ⑤ 当直连失败时（严格防火墙），走 TURN 中继             │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Realtime TURN（中继服务）                          │
│                                                             │
│  正常情况：A ←──直连──→ B （约 85% 的网络环境）                │
│  防火墙后：A ──→ TURN ──→ B （约 15% 需要中继）               │
│  - 免费额度：1000 GB/月                                      │
└─────────────────────────────────────────────────────────────┘
```

### 连接建立流程

```
用户A                    信令服务器(DO)                 用户B
  │                          │                          │
  │── WebSocket 连接 ──────►│                          │
  │◄── 分配 peerId ────────│                          │
  │                          │◄──── WebSocket 连接 ────│
  │                          │──── 分配 peerId ───────►│
  │◄── "新用户B加入" ────────│                          │
  │  [创建 RTCPeerConnection]                          │
  │  [生成 SDP offer]                                    │
  │── offer (经信令转发) ──►│── offer 转发 ──────────►│
  │                          │  [创建 RTCPeerConnection]│
  │                          │  [生成 SDP answer]       │
  │◄── answer 转发 ────────│◄── answer (经信令转发) ──│
  │◄────── ICE candidates 交换（双向）─────────────────►│
  │◄══════════ P2P 数据通道建立 ═══════════════════════►│
  │              （消息直接传输，不再经过信令服务器）         │
```

### Cloudflare 服务详解

| 服务                | 作用                           | 为什么需要                      |
| ------------------- | ------------------------------ | ------------------------------- |
| **Pages**           | 托管前端静态文件，全球 CDN     | 免费、快速、推送即部署          |
| **Workers**         | API 服务器、代理 TURN/SFU API  | 无服务器，全球边缘运行          |
| **Durable Objects** | 有状态信令房间，维护 WebSocket | 普通 Worker 无状态，DO 有"记忆" |
| **Realtime TURN**   | NAT 穿透中继，~15% 用户需要    | 没有 TURN，防火墙后用户无法连接 |
| **Realtime SFU**    | 多人音视频转发                 | P2P 多人视频带宽爆炸            |

---

## 部署指南

### 方案一：零终端部署（纯浏览器操作）

> 完全不需要安装任何软件。只需浏览器 + GitHub 账户 + Cloudflare 账户。

| 步骤 | 操作位置             | 做什么                                                                          |
| ---- | -------------------- | ------------------------------------------------------------------------------- |
| 1    | GitHub               | Fork 本仓库                                                                     |
| 2    | Cloudflare Dashboard | Calls → TURN Keys → Create（记下 ID 和 Token）                                  |
| 3    | Cloudflare Dashboard | Calls → SFU → Create App（记下 ID 和 Secret）                                   |
| 4    | GitHub               | 创建 `.github/workflows/deploy-worker.yml`（[内容见下方](#worker-部署-action)） |
| 5    | GitHub Settings      | Secrets → 添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`                |
| 6    | GitHub Actions       | 运行 Deploy Worker 工作流                                                       |
| 7    | Cloudflare Dashboard | Worker → Settings → Variables → 添加 4 个密钥（TURN + SFU）                     |
| 8    | Cloudflare Dashboard | Pages → Connect Git → 配置构建 → 部署                                           |
| 9    | Cloudflare Dashboard | Worker → Variables → 设置 `ALLOWED_ORIGINS`（自定义域名时）                     |

#### Worker 部署 Action

创建 `.github/workflows/deploy-worker.yml`：

```yaml
name: Deploy Worker
on:
  push:
    branches: [develop]
    paths: [worker/**]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install worker dependencies
        working-directory: worker
        run: npm install
      - name: Deploy Worker
        working-directory: worker
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

#### Pages 构建配置

| 设置项                      | 值                                              |
| --------------------------- | ----------------------------------------------- |
| Production branch           | `develop`                                       |
| Build command               | `npm run build:app`                             |
| Build output directory      | `dist`                                          |
| `NODE_VERSION`              | `20`                                            |
| `VITE_SIGNALING_SERVER_URL` | `wss://你的worker.workers.dev`                  |
| `VITE_RTC_CONFIG_ENDPOINT`  | `https://你的worker.workers.dev/api/get-config` |

#### CORS 配置（自定义域名）

> `.pages.dev` 和 `localhost` 自动允许，只有自定义域名需要配置。

在 Worker 的 Settings → Variables 中设置 `ALLOWED_ORIGINS`：

```
https://chat.example.com
```

多个域名逗号分隔：`https://a.com,https://b.com`

---

### 方案二：命令行部署

```bash
# 1. 克隆安装
git clone https://github.com/Shannon-x/chitchatter.git
cd chitchatter && npm install
cd worker && npm install && cd ..

# 2. 部署 Worker
cd worker
npx wrangler login && npx wrangler deploy

# 3. 配置密钥（在 Dashboard 创建 TURN Key 和 SFU App 后）
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
npx wrangler secret put SFU_APP_ID
npx wrangler secret put SFU_APP_SECRET

# 4. 部署前端
cd ..
VITE_SIGNALING_SERVER_URL="wss://你的worker.workers.dev" npm run build:app
npx wrangler pages deploy dist --project-name=chitchatter

# 5. 本地开发
npm run dev   # http://localhost:3000
```

---

## 环境变量

### 前端

| 变量                        | 必需   | 说明                       |
| --------------------------- | ------ | -------------------------- |
| `VITE_SIGNALING_SERVER_URL` | **是** | 信令 WebSocket 地址        |
| `VITE_RTC_CONFIG_ENDPOINT`  | 推荐   | TURN 配置 API 端点         |
| `VITE_SFU_API_BASE`         | 可选   | SFU API（启用 SFU 时）     |
| `VITE_ROUTER_TYPE`          | 可选   | `browser`（默认）或 `hash` |

### Worker

| 变量                 | 必需         | 说明                      |
| -------------------- | ------------ | ------------------------- |
| `TURN_KEY_ID`        | 推荐         | Cloudflare TURN Key ID    |
| `TURN_KEY_API_TOKEN` | 推荐         | Cloudflare TURN API Token |
| `SFU_APP_ID`         | 可选         | Cloudflare SFU App ID     |
| `SFU_APP_SECRET`     | 可选         | Cloudflare SFU App Secret |
| `ALLOWED_ORIGINS`    | 自定义域名时 | 逗号分隔的允许域名        |

---

## 费用

| 服务         | 免费额度              | 本项目用途 |
| ------------ | --------------------- | ---------- |
| Pages        | 无限站点，500 构建/月 | 前端托管   |
| Workers + DO | 10万请求/天           | 信令       |
| TURN         | 1000 GB/月            | NAT 穿透   |
| SFU          | 1000 GB/月            | 音视频转发 |

**中小规模使用完全免费。**

---

## 常见问题

<details>
<summary><b>对等方无法连接？</b></summary>

1. 浏览器控制台查看错误
2. 访问 `https://你的worker.workers.dev/health` 确认 Worker 正常
3. 访问 `https://你的worker.workers.dev/api/get-config` 确认 TURN 配置
4. CORS 错误 → 在 `ALLOWED_ORIGINS` 添加你的域名
5. 禁用广告拦截器
</details>

<details>
<summary><b>部署后页面空白？</b></summary>

- 检查 Pages 构建日志
- 确认 `VITE_SIGNALING_SERVER_URL` 已设置
- 确认用 `wss://` 而非 `https://`
</details>

<details>
<summary><b>iOS Safari 问题？</b></summary>

iOS Safari 对 WebRTC 有限制。建议使用 Chrome 或 Firefox。

</details>

---

## 开源协议

[GPL v2](LICENSE)

## 贡献

欢迎 PR 和 Issue。提交前确保：`npm run check:types` · `npm run lint` · `npm test` · `npm run prettier`

---

<a id="english"></a>

## English

### What is Chitchatter?

A free, open-source, decentralized peer-to-peer encrypted chat application. All communications are end-to-end encrypted and vanish when everyone leaves. Runs entirely on the Cloudflare ecosystem with zero external dependencies.

### Features

- **End-to-end encrypted** — Text via WebRTC P2P data channels with DTLS
- **Decentralized** — No central server stores messages
- **Ephemeral** — Conversations disappear when all participants leave
- **Multi-party** — Multiple peers per room
- **Video/Audio** — Via Cloudflare Realtime SFU
- **Screen sharing** — Share your screen with the room
- **File transfer** — Direct P2P encrypted transfer
- **Private rooms** — Password protected
- **Identity verification** — Public-key cryptography
- **Markdown** — Messages support Markdown with code highlighting
- **PWA** — Installable as desktop/mobile app
- **Bilingual** — Chinese/English with one-click toggle
- **Dark mode** — Light/dark theme switching

### Architecture

Runs on 5 Cloudflare services:

| Service             | Purpose                                     |
| ------------------- | ------------------------------------------- |
| **Pages**           | Frontend hosting with global CDN            |
| **Workers**         | API server, TURN/SFU proxy                  |
| **Durable Objects** | Stateful signaling rooms (WebSocket)        |
| **Realtime TURN**   | NAT traversal relay (~15% of users need it) |
| **Realtime SFU**    | Multi-party audio/video forwarding          |

**Text chat** → P2P data channels (E2E encrypted, server can't see content)
**Audio/Video** → Cloudflare SFU (efficient multi-party forwarding)
**Files/Images** → P2P data channels (Base64 encoded, direct transfer)

### Deployment

See the [Chinese deployment guide above](#部署指南) — it covers both zero-terminal (browser-only) and CLI deployment. The steps are the same regardless of language.

**Quick CLI deployment:**

```bash
git clone https://github.com/Shannon-x/chitchatter.git
cd chitchatter && npm install
cd worker && npm install && npx wrangler login && npx wrangler deploy && cd ..
VITE_SIGNALING_SERVER_URL="wss://your-worker.workers.dev" npm run build:app
npx wrangler pages deploy dist --project-name=chitchatter
```

### Cost

Fully within Cloudflare's free tier for small-to-medium usage. Pages (unlimited), Workers (100K req/day), TURN (1000 GB/mo), SFU (1000 GB/mo).

### License

[GPL v2](LICENSE)

### Contributing

PRs and issues welcome. Before submitting: `npm run check:types` · `npm run lint` · `npm test` · `npm run prettier`
