# 畅聊 (Chitchatter)

一款免费、开源、去中心化的点对点加密聊天应用。所有通讯端到端加密，离开即消失，不留痕迹。

## 功能特性

- **端到端加密** — 文字消息通过 WebRTC P2P 直连，端到端加密
- **去中心化** — 无中心服务器存储消息
- **即时消失** — 所有人离开房间后，对话历史自动消失
- **多人聊天** — 支持多人同时在线
- **音视频通话** — 通过 Cloudflare SFU 高效转发
- **屏幕共享** — 与房间内的人共享屏幕
- **文件传输** — 加密文件共享
- **私密房间** — 密码保护
- **身份验证** — 公钥加密验证
- **Markdown** — 消息支持 Markdown 和代码高亮
- **PWA** — 可安装为桌面/手机应用
- **多语言** — 中文/英文
- **暗色主题** — 亮色/暗色切换

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
│  WebRTC P2P 直连（文字聊天）                                  │
│                                                             │
│  用户 A ◄══════════ 数据通道（加密）══════════► 用户 B        │
│                                                             │
│  - 消息直接在浏览器之间传输，不经过任何服务器                    │
│  - DTLS 加密，即使信令服务器被攻破也无法解密消息                │
│  - 支持发送文本、表情、Markdown                               │
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
│  为什么不用 P2P 传视频？                                      │
│  - P2P: 5人视频，每人需上传 4 路 = 20路总流量                  │
│  - SFU: 5人视频，每人只上传 1 路 = 5路总流量 + SFU转发          │
│  - SFU 运行在 Cloudflare 全球数百个节点，自动就近接入           │
└─────────────────────────────────────────────────────────────┘
     │                                                  │
     │  ⑤ 当直连失败时（严格防火墙），走 TURN 中继             │
     ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Realtime TURN（中继服务）                          │
│                                                             │
│  正常情况：A ←──直连──→ B （约 85% 的网络环境）                │
│  防火墙后：A ──→ TURN ──→ B （约 15% 需要中继）               │
│                                                             │
│  - Worker 调用 Cloudflare API 生成短期凭证（24h 过期）         │
│  - 客户端用凭证连接 turn.cloudflare.com                       │
│  - 流量通过最近的 Cloudflare 节点中继                          │
│  - 即使中继，连接仍然是加密的                                  │
│  - 免费额度：1000 GB/月                                      │
└─────────────────────────────────────────────────────────────┘
```

### 连接建立流程（时序）

```
用户A                    信令服务器(DO)                 用户B
  │                          │                          │
  │── WebSocket 连接 ──────►│                          │
  │◄── 分配 peerId ────────│                          │
  │                          │                          │
  │                          │◄──── WebSocket 连接 ────│
  │                          │──── 分配 peerId ───────►│
  │                          │                          │
  │◄── "新用户B加入" ────────│                          │
  │                          │                          │
  │  [创建 RTCPeerConnection]                          │
  │  [创建数据通道]                                      │
  │  [生成 SDP offer]                                    │
  │                          │                          │
  │── offer (经信令转发) ──►│── offer 转发 ──────────►│
  │                          │                          │
  │                          │  [创建 RTCPeerConnection]│
  │                          │  [生成 SDP answer]       │
  │                          │                          │
  │◄── answer 转发 ────────│◄── answer (经信令转发) ──│
  │                          │                          │
  │◄────── ICE candidates 交换（双向）─────────────────►│
  │                          │                          │
  │◄══════════ P2P 数据通道建立 ═══════════════════════►│
  │              （消息直接传输，不再经过信令服务器）         │
```

### 各 Cloudflare 服务详解

#### 1. Cloudflare Pages — 前端托管

**是什么**：静态网站托管服务，类似 GitHub Pages 但更快。

**在本项目中的作用**：

- 托管编译后的 React 应用（HTML、JS、CSS、图片）
- 全球 CDN 分发，用户从最近的节点加载页面
- 自动 HTTPS
- 连接 GitHub 后自动构建部署（推送代码即部署）

**为什么用它**：免费、快速、与 GitHub 无缝集成，推送代码自动部署。

#### 2. Cloudflare Workers — 服务端逻辑

**是什么**：运行在 Cloudflare 边缘节点的 JavaScript 运行时（类似 AWS Lambda 但全球分布）。

**在本项目中的作用**：

- 作为 API 服务器处理 HTTP 请求
- 代理 Cloudflare TURN API（生成临时凭证，隐藏 API 密钥）
- 代理 Cloudflare SFU API（管理音视频会话，隐藏 App Secret）
- 路由 WebSocket 连接到正确的 Durable Object

**为什么用它**：无需管理服务器，代码运行在全球数百个节点，延迟低。

#### 3. Durable Objects — 有状态信令

**是什么**：Workers 的扩展，每个实例有独立的内存状态和存储，全球唯一。

**在本项目中的作用**：

- 每个聊天房间对应一个 Durable Object 实例
- 内存中维护该房间所有 WebSocket 连接
- 处理用户加入/离开/SDP交换

**为什么用它**：普通 Worker 是无状态的，无法维护 WebSocket 连接列表。Durable Object 解决了这个问题——它像一个"有记忆的服务员"，知道房间里有谁。

**具体工作原理**：

```
房间 "abc123" 的 Durable Object：
  内存状态 = {
    sessions: {
      "peer-1": WebSocket连接1,
      "peer-2": WebSocket连接2,
      "peer-3": WebSocket连接3,
    }
  }

  当收到来自 peer-1 的消息 { type: "offer", targetPeerId: "peer-2", sdp: "..." }：
    → 从 sessions 中找到 peer-2 的 WebSocket
    → 转发消息给 peer-2
```

#### 4. Cloudflare Realtime TURN — NAT 穿透

**是什么**：WebRTC 中继服务，当两个用户无法直连时提供流量中转。

**为什么需要**：

- 大约 85% 的情况下，WebRTC 可以通过 STUN 发现公网地址并直连
- 约 15% 的情况（对称 NAT、严格企业防火墙），必须通过 TURN 中继
- 没有 TURN，这些用户将完全无法连接

**工作流程**：

1. Worker 用 `TURN_KEY_ID` 和 `TURN_KEY_API_TOKEN` 调用 Cloudflare API
2. Cloudflare 返回临时用户名和密码（24小时过期）
3. 客户端用这些凭证连接 `turn.cloudflare.com`
4. 如果直连失败，WebRTC 自动回退到 TURN 中继

#### 5. Cloudflare Realtime SFU — 音视频转发

**是什么**：选择性转发单元（Selective Forwarding Unit），接收每个用户的媒体流并转发给其他用户。

**为什么需要**：

- P2P 网状拓扑在 3+ 人视频时带宽急剧增长：N人需要 N×(N-1) 路流
- SFU 星型拓扑：每人只上传 1 路，SFU 转发 N-1 路
- 5人视频：P2P 需要 20 路 vs SFU 只需 5 路上传 + 20 路服务器转发

**工作流程**：

1. Worker 用 `SFU_APP_ID` 和 `SFU_APP_SECRET` 代理 Cloudflare Realtime API
2. 用户加入房间时创建 SFU Session（对应一个 RTCPeerConnection 到 Cloudflare）
3. 用户开启摄像头 → 通过 SFU API 推送音视频轨道到 Cloudflare
4. 通过 P2P 数据通道通知其他用户有新轨道
5. 其他用户通过 SFU API 拉取（订阅）该轨道
6. Cloudflare SFU 自动将音视频从上传者转发给所有订阅者

---

## 部署指南

### 方案一：零终端部署（纯浏览器操作）

> 完全不需要安装任何软件，不需要打开终端/命令行。只需要一个浏览器和 GitHub 账户。

#### 前置条件

- [GitHub 账户](https://github.com/signup)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)（免费注册）

#### 步骤 1：Fork 仓库

1. 打开 [本项目的 GitHub 仓库](https://github.com/Shannon-x/chitchatter)
2. 点击右上角 **Fork** 按钮
3. 确认创建 Fork

#### 步骤 2：创建 Cloudflare TURN Key

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单选择 **Calls**（如果看不到，在搜索框搜索 "Calls"）
3. 点击 **TURN Keys** → **Create TURN Key**
4. 记下两个值：
   - **TURN Key ID**（一串字母数字）
   - **API Token**（点击显示并复制）

#### 步骤 3：创建 Cloudflare SFU App

1. 还在 Calls 页面，点击 **SFU** → **Create Application**
2. 输入名称（如 "chitchatter"）
3. 创建后记下两个值：
   - **App ID**
   - **App Secret**（Token）

#### 步骤 4：添加 Worker 部署 GitHub Action

在你 Fork 的仓库中创建 `.github/workflows/deploy-worker.yml` 文件：

1. 在 GitHub 仓库页面，点击 **Add file** → **Create new file**
2. 文件名输入：`.github/workflows/deploy-worker.yml`
3. 粘贴以下内容：

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

4. 点击 **Commit changes**

#### 步骤 5：配置 GitHub Secrets

1. 在你 Fork 的仓库，进入 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets（点击 **New repository secret**）：

| Secret 名称             | 值                   | 获取方式                                                                                 |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API Token | Dashboard → My Profile → API Tokens → Create Token → 选择 "Edit Cloudflare Workers" 模板 |
| `CLOUDFLARE_ACCOUNT_ID` | 你的账户 ID          | Dashboard 首页右侧 "Account ID"                                                          |

#### 步骤 6：触发 Worker 部署

1. 在仓库页面，点击 **Actions** 标签
2. 选择 **Deploy Worker** 工作流
3. 点击 **Run workflow** → **Run workflow**
4. 等待部署完成（约 1-2 分钟）
5. 查看部署日志，找到 Worker URL，格式如：`https://chitchatter-signaling.你的子域名.workers.dev`

#### 步骤 7：设置 Worker 密钥

> 这一步目前需要简短的终端操作，或者使用 Cloudflare Dashboard：

**方法 A：通过 Cloudflare Dashboard（零终端）：**

1. Dashboard → **Workers & Pages** → 选择你的 Worker
2. **Settings** → **Variables** → **Environment Variables**
3. 添加以下加密变量（选择 "Encrypt"）：

| 变量名               | 值                           |
| -------------------- | ---------------------------- |
| `TURN_KEY_ID`        | 步骤 2 获得的 TURN Key ID    |
| `TURN_KEY_API_TOKEN` | 步骤 2 获得的 TURN API Token |
| `SFU_APP_ID`         | 步骤 3 获得的 SFU App ID     |
| `SFU_APP_SECRET`     | 步骤 3 获得的 SFU App Secret |

4. 点击 **Save and deploy**

**方法 B：通过终端（如果你有 wrangler）：**

```bash
cd worker
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
npx wrangler secret put SFU_APP_ID
npx wrangler secret put SFU_APP_SECRET
```

#### 步骤 8：部署前端到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧选择 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 授权 GitHub 并选择你 Fork 的仓库
4. 配置构建：
   - **Production branch**: `develop`
   - **Build command**: `npm run build:app`
   - **Build output directory**: `dist`
5. 展开 **Environment variables (advanced)**，添加：

| 变量名                      | 值                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_SIGNALING_SERVER_URL` | `wss://chitchatter-signaling.你的子域名.workers.dev`（步骤 6 获得的 URL，`https` 改为 `wss`） |
| `VITE_RTC_CONFIG_ENDPOINT`  | `https://chitchatter-signaling.你的子域名.workers.dev/api/get-config`                         |
| `NODE_VERSION`              | `20`                                                                                          |

6. 点击 **Save and Deploy**
7. 等待构建完成（约 2-3 分钟）
8. 部署完成后获得 URL：`https://你的项目名.pages.dev`

#### 步骤 9：配置 CORS（允许自定义域名访问 Worker）

> `.pages.dev` 和 `localhost` 域名自动允许，**只有使用自定义域名时才需要此步骤**。

1. Cloudflare Dashboard → **Workers & Pages** → 选择你的 Worker
2. **Settings** → **Variables and Secrets**
3. 找到 `ALLOWED_ORIGINS` 变量，设置为你的自定义域名（含 `https://`）：
   - 单个域名：`https://chat.example.com`
   - 多个域名（逗号分隔）：`https://chat.example.com,https://www.example.com`
4. 点击 **Save and deploy**

也可以直接编辑 `worker/wrangler.toml`：

```toml
[vars]
ALLOWED_ORIGINS = "https://chat.example.com"
```

#### 完成！

访问你的域名即可使用。分享房间 URL 给朋友，进入同一房间即可加密聊天。

---

### 方案二：命令行部署

适合开发者，操作更灵活。

#### 前置条件

- [Node.js 20.x](https://nodejs.org/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)

#### 1. 克隆并安装

```bash
git clone https://github.com/你的用户名/chitchatter.git
cd chitchatter
npm install
cd worker && npm install && cd ..
```

#### 2. 部署 Worker

```bash
cd worker
npx wrangler login          # 浏览器中授权
npx wrangler deploy          # 部署，记下输出的 URL
```

#### 3. 配置密钥

```bash
# 在 Cloudflare Dashboard 中创建 TURN Key 和 SFU App，然后：
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
npx wrangler secret put SFU_APP_ID
npx wrangler secret put SFU_APP_SECRET
```

#### 4. 部署前端

```bash
cd ..
export VITE_SIGNALING_SERVER_URL="wss://你的worker.workers.dev"
export VITE_RTC_CONFIG_ENDPOINT="https://你的worker.workers.dev/api/get-config"
npm run build:app
npx wrangler pages deploy dist --project-name=chitchatter
```

#### 5. 本地开发

```bash
npm run dev   # 启动 Vite + Worker 本地服务器
```

访问 http://localhost:3000

---

## 环境变量参考

### 前端（构建时，VITE\_ 前缀）

| 变量                        | 必需   | 说明                              | 示例                                        |
| --------------------------- | ------ | --------------------------------- | ------------------------------------------- |
| `VITE_SIGNALING_SERVER_URL` | **是** | 信令服务器 WebSocket 地址         | `wss://signal.workers.dev`                  |
| `VITE_RTC_CONFIG_ENDPOINT`  | 推荐   | TURN/SFU 配置 API 端点            | `https://signal.workers.dev/api/get-config` |
| `VITE_SFU_API_BASE`         | 可选   | SFU API 地址（默认从信令URL推导） | `https://signal.workers.dev`                |
| `VITE_HOMEPAGE`             | 可选   | 应用首页 URL                      | `https://chat.example.com`                  |
| `VITE_ROUTER_TYPE`          | 可选   | `browser`（默认）或 `hash`        | `hash`                                      |

### Worker（运行时密钥）

| 变量                 | 必需 | 说明                       | 获取位置                   |
| -------------------- | ---- | -------------------------- | -------------------------- |
| `TURN_KEY_ID`        | 推荐 | Cloudflare TURN Key ID     | Dashboard → Calls → TURN   |
| `TURN_KEY_API_TOKEN` | 推荐 | Cloudflare TURN API Token  | 同上                       |
| `SFU_APP_ID`         | 推荐 | Cloudflare SFU App ID      | Dashboard → Calls → SFU    |
| `SFU_APP_SECRET`     | 推荐 | Cloudflare SFU App Secret  | 同上                       |
| `ALLOWED_ORIGINS`    | 推荐 | 允许的前端域名（逗号分隔） | wrangler.toml 或 Dashboard |

---

## 费用估算

| Cloudflare 服务 | 免费额度               | 超出费用       | 本项目用途     |
| --------------- | ---------------------- | -------------- | -------------- |
| Pages           | 无限站点，500次构建/月 | 付费计划       | 前端托管       |
| Workers         | 10万请求/天            | $0.30/百万请求 | API + 信令路由 |
| Durable Objects | 100万请求/月           | $0.15/百万请求 | 信令房间       |
| Realtime TURN   | 1000 GB/月             | $0.05/GB       | NAT 穿透中继   |
| Realtime SFU    | 1000 GB/月             | $0.05/GB       | 音视频转发     |
| 带宽            | 无限                   | 无限           | 静态资源分发   |

**典型使用场景费用**：

- 10 人日常使用文字聊天：完全免费
- 50 人偶尔视频通话：完全免费
- 100+ 人频繁视频：可能超出免费额度，约 $1-5/月

---

## 项目结构

```
chitchatter/
├── worker/                    # Cloudflare Worker（后端）
│   ├── src/
│   │   ├── index.ts           # 路由：信令/TURN/SFU API代理
│   │   └── SignalingRoom.ts   # Durable Object：WebSocket信令房间
│   ├── wrangler.toml          # Worker 部署配置
│   └── package.json
├── src/
│   ├── lib/
│   │   ├── PeerRoom/          # 核心：P2P房间管理
│   │   │   ├── PeerRoom.ts    # WebRTC连接管理（P2P文字+SFU媒体）
│   │   │   └── types.ts       # 房间配置和消息类型
│   │   ├── SfuClient/         # SFU客户端：会话/轨道管理
│   │   └── ConnectionTest/    # 连接测试
│   ├── i18n/locales/          # 翻译文件（zh-CN + en）
│   ├── components/            # React 组件
│   ├── pages/                 # 页面
│   └── config/                # 配置
├── .github/workflows/         # CI/CD
│   ├── deploy-worker.yml      # Worker 自动部署
│   └── ci.yml                 # 测试和类型检查
└── index.html
```

---

## 常见问题

### 对等方无法连接？

**排查顺序**：

1. 打开浏览器控制台查看错误信息
2. 确认信令服务器可访问：浏览器打开 `https://你的worker.workers.dev`，应返回 "Not Found"（正常）
3. 确认 TURN 配置：访问 `https://你的worker.workers.dev/api/get-config`，应返回 JSON
4. 检查 CORS：控制台有 "blocked by CORS" 错误 → 在 Worker 的 `ALLOWED_ORIGINS` 环境变量中添加你的域名
5. 禁用广告拦截器（可能阻止 WebSocket 连接）
6. 尝试其他网络

### 视频卡顿？

- 如果 SFU 未配置（`SFU_APP_ID` 未设置），视频走 P2P，多人时带宽不足
- 确认已配置 SFU 密钥并重新部署 Worker

### iOS Safari 问题

iOS Safari 对 WebRTC 有限制。建议使用 Chrome 或 Firefox。

### 部署后页面空白？

- 检查 Pages 构建日志是否有错误
- 确认 `VITE_SIGNALING_SERVER_URL` 环境变量已正确设置
- 确认使用了 `wss://`（不是 `https://`）作为信令 URL

---

## 开源协议

[GPL v2](LICENSE)

## 贡献

欢迎 Pull Request 和 Issue。提交前请确保：

1. `npm run check:types` — 零类型错误
2. `npm run lint` — 零警告
3. `npm test` — 所有测试通过
4. `npm run prettier` — 代码格式化
