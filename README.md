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

> 完全不需要安装任何软件，不需要打开终端/命令行。只需要一个浏览器、GitHub 账户和 Cloudflare 账户（免费）。

#### 步骤 1：Fork 仓库

1. 打开 [本项目的 GitHub 仓库](https://github.com/Shannon-x/chitchatter)
2. 点击右上角 **Fork** 按钮
3. 确认创建，你会得到自己的仓库副本

#### 步骤 2：创建 Cloudflare TURN Key

> TURN 服务让处于严格防火墙后的用户也能连接。

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单：**媒体** → **Realtime** → **TURN 服务器**
3. 点击 **Create TURN Key**（创建 TURN 密钥）
4. **记下两个值**（后面要用）：
   - **TURN Key ID**（一串字母数字，如 `a1b2c3d4...`）
   - **API Token**（点击显示并复制）

#### 步骤 3：创建 Cloudflare SFU App（可选）

> SFU 让多人视频通话更高效。如果你只需要文字聊天，可以跳过此步。

1. 还在 Realtime 页面，点击 **无服务器 SFU**
2. 点击 **Create Application**（创建应用）
3. 输入名称（如 `chitchatter`），点击创建
4. **记下两个值**：
   - **App ID**（如 `4b90c609...`）
   - **App Secret / Token**

#### 步骤 4：配置 GitHub Secrets

> 这些密钥让 GitHub Actions 能够部署到你的 Cloudflare 账户。

1. 获取 Cloudflare API Token：
   - Cloudflare Dashboard → 右上角头像 → **我的个人资料** → **API 令牌**
   - 点击 **创建令牌** → 选择 **编辑 Cloudflare Workers** 模板 → 创建
   - **复制生成的 Token**

2. 获取 Account ID：
   - Cloudflare Dashboard 首页，右侧栏可以看到 **帐户 ID**
   - **复制这个 ID**

3. 在你 Fork 的 GitHub 仓库中设置：
   - 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
   - 点击 **New repository secret**，添加两个：

| Secret 名称 | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 上面获取的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 上面获取的 Account ID |

#### 步骤 5：部署 Worker（信令服务器）

> Worker 是后端服务，处理信令和 API 请求。

仓库中已经包含了部署工作流文件 `.github/workflows/deploy-worker.yml`。

1. 在仓库页面，点击 **Actions** 标签
2. 如果提示启用 Actions，点击 **I understand my workflows, go ahead and enable them**
3. 左侧选择 **Deploy Worker**
4. 点击 **Run workflow** → 选择 `develop` 分支 → **Run workflow**
5. 等待 1-2 分钟，看到绿色 ✅ 表示部署成功
6. 在部署日志中找到 Worker URL，格式如：
   ```
   https://chitchatter-signaling.你的子域名.workers.dev
   ```
   **记下这个 URL**，后面要用。

#### 步骤 6：设置 Worker 密钥

> 把步骤 2、3 获得的密钥配置到 Worker。

1. Cloudflare Dashboard → **Compute** → **Workers 和 Pages**
2. 点击你的 Worker（名称类似 `chitchatter-signaling`）
3. 进入 **设置** → **变量和机密**
4. 在 **环境变量** 部分，逐个添加以下变量（点击 **添加**，类型选 **Secret 密文**）：

| 变量名 | 值 | 说明 |
|---|---|---|
| `TURN_KEY_ID` | 步骤 2 的 TURN Key ID | TURN 服务认证 |
| `TURN_KEY_API_TOKEN` | 步骤 2 的 API Token | TURN 服务认证 |
| `SFU_APP_ID` | 步骤 3 的 App ID | SFU 服务（可选） |
| `SFU_APP_SECRET` | 步骤 3 的 App Secret | SFU 服务（可选） |

5. 点击 **部署 (Deploy)** 保存

#### 步骤 7：部署前端到 Cloudflare Pages

1. Cloudflare Dashboard → **Compute** → **Workers 和 Pages**
2. 点击 **创建** → **Pages** → **连接到 Git**
3. 授权 GitHub，选择你 Fork 的 `chitchatter` 仓库
4. 配置构建设置：

| 设置项 | 值 |
|---|---|
| 生产分支 (Production branch) | `develop` |
| 构建命令 (Build command) | `npm run build:app` |
| 构建输出目录 (Build output directory) | `dist` |

5. 展开 **环境变量（高级）**，添加以下变量：

| 变量名 | 值 | 说明 |
|---|---|---|
| `NODE_VERSION` | `20` | Node.js 版本 |
| `VITE_SIGNALING_SERVER_URL` | `wss://chitchatter-signaling.你的子域名.workers.dev` | **步骤 5** 得到的 URL，把 `https://` 改为 `wss://` |
| `VITE_RTC_CONFIG_ENDPOINT` | `https://chitchatter-signaling.你的子域名.workers.dev/api/get-config` | TURN 配置接口 |

> ⚠️ **注意**：`VITE_SIGNALING_SERVER_URL` 必须用 `wss://` 开头（WebSocket 协议），不是 `https://`

6. 点击 **保存并部署**
7. 等待 2-3 分钟构建完成
8. 部署成功后获得 URL：`https://你的项目名.pages.dev`

#### 步骤 8：配置 CORS（使用自定义域名时）

> 如果你只使用 `.pages.dev` 默认域名，**跳过此步**。`.pages.dev` 和 `localhost` 自动允许。

使用自定义域名（如 `chat.example.com`）时：

1. Cloudflare Dashboard → **Workers 和 Pages** → 选择你的 Worker
2. **设置** → **变量和机密**
3. 添加环境变量（类型选 **明文 Text**）：

| 变量名 | 值 |
|---|---|
| `ALLOWED_ORIGINS` | `https://你的自定义域名` |

多个域名用逗号分隔：`https://chat.example.com,https://www.example.com`

4. 点击 **部署 (Deploy)** 保存

#### 步骤 9：验证

1. **Worker 健康检查**：浏览器打开 `https://你的worker.workers.dev/health`
   - 正常返回：`{"status":"ok"}`
2. **TURN 配置**：打开 `https://你的worker.workers.dev/api/get-config`
   - 正常返回 JSON，包含 `iceServers` 数组
3. **前端**：打开你的 Pages URL
   - 应显示畅聊界面
4. **P2P 测试**：打开两个浏览器标签，进入同一房间
   - 双方应能互相看到并发送消息

#### 🎉 完成！

访问你的域名即可使用。分享房间 URL 给朋友，进入同一房间即可加密聊天。

---

### 方案二：命令行部署

适合开发者，操作更灵活。

#### 前置条件

- [Node.js 20.x](https://nodejs.org/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)（免费注册）

#### 1. 克隆并安装

```bash
git clone https://github.com/Shannon-x/chitchatter.git
cd chitchatter
npm install
cd worker && npm install && cd ..
```

#### 2. 部署 Worker

```bash
cd worker
npx wrangler login       # 浏览器中授权 Cloudflare
npx wrangler deploy      # 部署，记下输出的 URL
```

部署成功后终端输出 Worker URL，例如：
```
https://chitchatter-signaling.你的子域名.workers.dev
```

#### 3. 创建 TURN Key 和 SFU App

1. Cloudflare Dashboard → **媒体** → **Realtime** → **TURN 服务器** → 创建
2. Cloudflare Dashboard → **媒体** → **Realtime** → **无服务器 SFU** → 创建应用

#### 4. 配置 Worker 密钥

```bash
cd worker
npx wrangler secret put TURN_KEY_ID          # 粘贴 TURN Key ID
npx wrangler secret put TURN_KEY_API_TOKEN   # 粘贴 TURN API Token
npx wrangler secret put SFU_APP_ID           # 粘贴 SFU App ID（可选）
npx wrangler secret put SFU_APP_SECRET       # 粘贴 SFU App Secret（可选）
```

#### 5. 部署前端

```bash
cd ..
export VITE_SIGNALING_SERVER_URL="wss://你的worker.workers.dev"
export VITE_RTC_CONFIG_ENDPOINT="https://你的worker.workers.dev/api/get-config"
npm run build:app
npx wrangler pages deploy dist --project-name=chitchatter
```

#### 6. 本地开发

```bash
npm run dev   # 启动 Vite + Worker 本地服务器
```

访问 http://localhost:3000

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

A free, open-source, decentralized peer-to-peer encrypted chat application. All communications are end-to-end encrypted and vanish when everyone leaves. Runs entirely on the Cloudflare ecosystem with zero external dependencies.

### Features

| Feature | Description |
|---|---|
| 🔐 End-to-end encrypted | Text messages via WebRTC P2P data channels with DTLS encryption |
| 🌐 Decentralized | No central server stores messages |
| 💨 Ephemeral | Conversations disappear when all participants leave |
| 👥 Multi-party | Multiple peers per room |
| 📹 Video/Audio calls | Via Cloudflare Realtime SFU for efficient multi-party forwarding |
| 🖥️ Screen sharing | Share your screen with the room |
| 📁 File transfer | Direct P2P encrypted transfer via data channels |
| 🔑 Private rooms | Password protected |
| ✅ Identity verification | Public-key cryptography |
| 📝 Markdown | Messages support Markdown with code syntax highlighting |
| 📱 PWA | Installable as desktop/mobile app |
| 🌍 Bilingual | Chinese/English with one-click toggle |
| 🌙 Dark mode | Light/dark theme switching |

### Architecture

This project runs entirely on the Cloudflare ecosystem, using 5 Cloudflare services:

```
User A's Browser                                   User B's Browser
     │                                                  │
     │  ① Load frontend                                 │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Pages (Frontend hosting, global CDN)            │
│  Hosts HTML/JS/CSS static files, users load from nearest    │
│  edge node                                                  │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ② Establish WebSocket to signaling server        │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Worker + Durable Object (Signaling Server)      │
│                                                             │
│  Each chat room = one Durable Object instance               │
│  Responsibilities:                                          │
│    - Maintain WebSocket connections for all online users     │
│    - Notify others when a new user joins                    │
│    - Relay SDP offer/answer (WebRTC connection parameters)  │
│    - Relay ICE candidates (network address candidates)      │
│    - Notify others when a user leaves                       │
│                                                             │
│  Note: Signaling server only relays connection parameters,  │
│  never touches actual message content                       │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ③ After exchanging parameters, establish P2P     │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  WebRTC P2P Direct Connection (Text chat + File transfer)   │
│                                                             │
│  User A ◄═══════ Data Channel (encrypted) ═══════► User B  │
│                                                             │
│  - Messages transfer directly between browsers              │
│  - DTLS encrypted, even if signaling server is compromised  │
│  - Supports text, emoji, Markdown, images, files            │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ④ Audio/video via SFU (efficient for multi-party)│
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Realtime SFU (Selective Forwarding Unit)        │
│                                                             │
│  User A ──upload 1 stream──► SFU ──forward──► User B       │
│                                │──forward──► User C        │
│                                │──forward──► User D        │
│                                                             │
│  P2P: 5-person video = 4 uploads each = 20 total streams   │
│  SFU: 5-person video = 1 upload each = 5 uploads + forward │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ⑤ When direct connection fails, use TURN relay   │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Realtime TURN (Relay Service)                   │
│                                                             │
│  Normal: A ←──direct──→ B (~85% of networks)               │
│  Firewall: A ──→ TURN ──→ B (~15% need relay)              │
│  - Free tier: 1000 GB/month                                │
└─────────────────────────────────────────────────────────────┘
```

### Connection Establishment Flow

```
User A                   Signaling Server (DO)           User B
  │                          │                          │
  │── WebSocket connect ───►│                          │
  │◄── assign peerId ──────│                          │
  │                          │◄──── WebSocket connect ─│
  │                          │──── assign peerId ─────►│
  │◄── "User B joined" ─────│                          │
  │  [Create RTCPeerConnection]                        │
  │  [Generate SDP offer]                                │
  │── offer (via signaling) ►│── forward offer ───────►│
  │                          │  [Create RTCPeerConnection]│
  │                          │  [Generate SDP answer]   │
  │◄── forward answer ──────│◄── answer (via signaling)│
  │◄────── ICE candidates exchange (bidirectional) ────►│
  │◄══════════ P2P Data Channel Established ═══════════►│
  │        (Messages transfer directly, no longer       │
  │         through signaling server)                   │
```

### Cloudflare Services Explained

| Service | Purpose | Why needed |
|---|---|---|
| **Pages** | Host frontend static files, global CDN | Free, fast, push-to-deploy |
| **Workers** | API server, proxy TURN/SFU API | Serverless, runs on global edge nodes |
| **Durable Objects** | Stateful signaling rooms, maintain WebSocket | Regular Workers are stateless; DO has "memory" |
| **Realtime TURN** | NAT traversal relay, ~15% users need it | Without TURN, users behind firewalls can't connect |
| **Realtime SFU** | Multi-party audio/video forwarding | P2P multi-party video causes bandwidth explosion |

### Deployment Guide

#### Option 1: Zero-Terminal Deployment (Browser Only)

> No software installation needed. Just a browser + GitHub account + Cloudflare account (free).

##### Step 1: Fork the Repository

1. Open [this GitHub repository](https://github.com/Shannon-x/chitchatter)
2. Click the **Fork** button in the top right
3. Confirm to create your own copy

##### Step 2: Create Cloudflare TURN Key

> TURN service allows users behind strict firewalls to connect.

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Left sidebar: **Media** → **Realtime** → **TURN Server**
3. Click **Create TURN Key**
4. **Note down two values** (needed later):
   - **TURN Key ID** (e.g. `a1b2c3d4...`)
   - **API Token** (click to reveal and copy)

##### Step 3: Create Cloudflare SFU App (Optional)

> SFU makes multi-party video calls more efficient. Skip if you only need text chat.

1. Still on the Realtime page, click **Serverless SFU**
2. Click **Create Application**
3. Enter a name (e.g. `chitchatter`), click create
4. **Note down two values**:
   - **App ID** (e.g. `4b90c609...`)
   - **App Secret / Token**

##### Step 4: Configure GitHub Secrets

> These secrets allow GitHub Actions to deploy to your Cloudflare account.

1. Get Cloudflare API Token:
   - Cloudflare Dashboard → top right avatar → **My Profile** → **API Tokens**
   - Click **Create Token** → select **Edit Cloudflare Workers** template → Create
   - **Copy the generated Token**

2. Get Account ID:
   - Cloudflare Dashboard home page, right sidebar shows **Account ID**
   - **Copy this ID**

3. In your forked GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**, add two:

| Secret Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | API Token from above |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from above |

##### Step 5: Deploy Worker (Signaling Server)

> The Worker is the backend service handling signaling and API requests.

The repository already includes the deployment workflow file `.github/workflows/deploy-worker.yml`.

1. In the repository page, click the **Actions** tab
2. If prompted to enable Actions, click **I understand my workflows, go ahead and enable them**
3. Select **Deploy Worker** on the left
4. Click **Run workflow** → select `develop` branch → **Run workflow**
5. Wait 1-2 minutes, green ✅ means deployment succeeded
6. Find the Worker URL in the deployment logs:
   ```
   https://chitchatter-signaling.your-subdomain.workers.dev
   ```
   **Note this URL down** — you'll need it later.

##### Step 6: Set Worker Secrets

> Configure the TURN and SFU keys from Steps 2 & 3 into the Worker.

1. Cloudflare Dashboard → **Compute** → **Workers and Pages**
2. Click your Worker (named something like `chitchatter-signaling`)
3. Go to **Settings** → **Variables and Secrets**
4. In the **Environment Variables** section, add each variable (click **Add**, type select **Secret**):

| Variable Name | Value | Description |
|---|---|---|
| `TURN_KEY_ID` | TURN Key ID from Step 2 | TURN service auth |
| `TURN_KEY_API_TOKEN` | API Token from Step 2 | TURN service auth |
| `SFU_APP_ID` | App ID from Step 3 | SFU service (optional) |
| `SFU_APP_SECRET` | App Secret from Step 3 | SFU service (optional) |

5. Click **Deploy** to save

##### Step 7: Deploy Frontend to Cloudflare Pages

1. Cloudflare Dashboard → **Compute** → **Workers and Pages**
2. Click **Create** → **Pages** → **Connect to Git**
3. Authorize GitHub, select your forked `chitchatter` repository
4. Configure build settings:

| Setting | Value |
|---|---|
| Production branch | `develop` |
| Build command | `npm run build:app` |
| Build output directory | `dist` |

5. Expand **Environment variables (advanced)**, add:

| Variable Name | Value | Description |
|---|---|---|
| `NODE_VERSION` | `20` | Node.js version |
| `VITE_SIGNALING_SERVER_URL` | `wss://chitchatter-signaling.your-subdomain.workers.dev` | Worker URL from **Step 5**, change `https://` to `wss://` |
| `VITE_RTC_CONFIG_ENDPOINT` | `https://chitchatter-signaling.your-subdomain.workers.dev/api/get-config` | TURN config endpoint |

> ⚠️ **Important**: `VITE_SIGNALING_SERVER_URL` must start with `wss://` (WebSocket protocol), NOT `https://`

6. Click **Save and Deploy**
7. Wait 2-3 minutes for the build to complete
8. After deployment, you'll get a URL: `https://your-project-name.pages.dev`

##### Step 8: Configure CORS (For Custom Domains)

> If you only use the default `.pages.dev` domain, **skip this step**. `.pages.dev` and `localhost` are automatically allowed.

When using a custom domain (e.g. `chat.example.com`):

1. Cloudflare Dashboard → **Workers and Pages** → select your Worker
2. **Settings** → **Variables and Secrets**
3. Add an environment variable (type select **Text**):

| Variable Name | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://your-custom-domain` |

Multiple domains separated by commas: `https://chat.example.com,https://www.example.com`

4. Click **Deploy** to save

##### Step 9: Verify

1. **Worker health check**: Open `https://your-worker.workers.dev/health` in browser
   - Should return: `{"status":"ok"}`
2. **TURN config**: Open `https://your-worker.workers.dev/api/get-config`
   - Should return JSON with `iceServers` array
3. **Frontend**: Open your Pages URL
   - Should display the chat interface
4. **P2P test**: Open two browser tabs, join the same room
   - Both should see each other and be able to send messages

##### 🎉 Done!

Visit your domain to start using it. Share the room URL with friends — enter the same room for encrypted chat.

---

#### Option 2: CLI Deployment

For developers who prefer more control.

##### Prerequisites

- [Node.js 20.x](https://nodejs.org/)
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free)

##### 1. Clone and Install

```bash
git clone https://github.com/Shannon-x/chitchatter.git
cd chitchatter
npm install
cd worker && npm install && cd ..
```

##### 2. Deploy Worker

```bash
cd worker
npx wrangler login       # Authorize in browser
npx wrangler deploy      # Deploy, note the output URL
```

Output will show the Worker URL:
```
https://chitchatter-signaling.your-subdomain.workers.dev
```

##### 3. Create TURN Key and SFU App

1. Cloudflare Dashboard → **Media** → **Realtime** → **TURN Server** → Create
2. Cloudflare Dashboard → **Media** → **Realtime** → **Serverless SFU** → Create App

##### 4. Configure Worker Secrets

```bash
cd worker
npx wrangler secret put TURN_KEY_ID          # Paste TURN Key ID
npx wrangler secret put TURN_KEY_API_TOKEN   # Paste TURN API Token
npx wrangler secret put SFU_APP_ID           # Paste SFU App ID (optional)
npx wrangler secret put SFU_APP_SECRET       # Paste SFU App Secret (optional)
```

##### 5. Deploy Frontend

```bash
cd ..
export VITE_SIGNALING_SERVER_URL="wss://your-worker.workers.dev"
export VITE_RTC_CONFIG_ENDPOINT="https://your-worker.workers.dev/api/get-config"
npm run build:app
npx wrangler pages deploy dist --project-name=chitchatter
```

##### 6. Local Development

```bash
npm run dev   # Start Vite + Worker local server
```

Visit http://localhost:3000

### Environment Variables

#### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_SIGNALING_SERVER_URL` | **Yes** | Signaling WebSocket URL |
| `VITE_RTC_CONFIG_ENDPOINT` | Recommended | TURN config API endpoint |
| `VITE_SFU_API_BASE` | Optional | SFU API (when SFU is enabled) |
| `VITE_ROUTER_TYPE` | Optional | `browser` (default) or `hash` |

#### Worker

| Variable | Required | Description |
|---|---|---|
| `TURN_KEY_ID` | Recommended | Cloudflare TURN Key ID |
| `TURN_KEY_API_TOKEN` | Recommended | Cloudflare TURN API Token |
| `SFU_APP_ID` | Optional | Cloudflare SFU App ID |
| `SFU_APP_SECRET` | Optional | Cloudflare SFU App Secret |
| `ALLOWED_ORIGINS` | For custom domains | Comma-separated allowed origins |

### Cost

| Service | Free Tier | Usage in this project |
|---|---|---|
| Pages | Unlimited sites, 500 builds/mo | Frontend hosting |
| Workers + DO | 100K requests/day | Signaling |
| TURN | 1000 GB/mo | NAT traversal |
| SFU | 1000 GB/mo | Audio/video forwarding |

**Fully free for small-to-medium usage.**

### FAQ

<details>
<summary><b>Peers can't connect?</b></summary>

1. Check browser console for errors
2. Visit `https://your-worker.workers.dev/health` to confirm Worker is running
3. Visit `https://your-worker.workers.dev/api/get-config` to confirm TURN config
4. CORS error → add your domain to `ALLOWED_ORIGINS`
5. Disable ad blockers
</details>

<details>
<summary><b>Blank page after deployment?</b></summary>

- Check Pages build logs for errors
- Confirm `VITE_SIGNALING_SERVER_URL` is set
- Confirm using `wss://` not `https://`
</details>

<details>
<summary><b>iOS Safari issues?</b></summary>

iOS Safari has WebRTC limitations. Use Chrome or Firefox instead.
</details>

### License

[GPL v2](LICENSE)

### Contributing

PRs and issues welcome. Before submitting: `npm run check:types` · `npm run lint` · `npm test` · `npm run prettier`
