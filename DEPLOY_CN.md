# 将 Chitchatter 部署到 Cloudflare Pages 中文教程

本教程将指导您如何将 Chitchatter 项目部署到 Cloudflare Pages。Cloudflare Pages 提供了一个快速、安全且可靠的方式来托管静态网站。

## 先决条件

1.  **一个 Cloudflare 账户:** 如果您还没有，请访问 [Cloudflare 官网](https://www.cloudflare.com/) 注册一个账户。
2.  **代码托管在 Git 仓库:** 您的 Chitchatter 项目代码需要托管在 GitHub、GitLab 或 Bitbucket 等 Git 服务提供商上。本教程将以 GitHub 为例。
3.  **本地开发环境已配置:** 确保您的本地开发环境可以成功构建 Chitchatter 项目。

## 部署步骤

### 1. 登录 Cloudflare 并进入 Pages

-   打开您的浏览器，访问 [Cloudflare 控制台](https://dash.cloudflare.com/) 并登录。
-   在左侧导航栏中，找到并点击 "Workers & Pages"。

### 2. 创建一个新的 Pages 项目

-   在 "Workers & Pages" 概览页面，点击 "Create application" 按钮。
-   在弹出的选项中，选择 "Pages" 标签页。
-   点击 "Connect to Git" 按钮。

### 3. 连接到您的 Git 仓库

-   **选择您的 Git 提供商:** 选择您托管 Chitchatter 代码的 Git 提供商 (例如 GitHub)。
-   **授权 Cloudflare 访问:** 如果是首次连接，您可能需要授权 Cloudflare 访问您的 Git 账户和仓库。按照提示完成授权。
-   **选择项目仓库:** 从仓库列表中选择您的 Chitchatter 项目仓库。
-   点击 "Begin setup"。

### 4. 配置构建和部署设置

在此步骤中，您需要告诉 Cloudflare Pages 如何构建您的 Chitchatter 项目。

-   **Project name:** (项目名称) Cloudflare 会自动填充仓库名称，您可以根据需要修改。
-   **Production branch:** (生产分支) 选择您希望部署到生产环境的分支，通常是 `main` 或 `master`。
-   **Framework preset:** (框架预设) Chitchatter 是一个基于 Vite 构建的 React 应用。您可以尝试选择 "Vite" 作为框架预设。如果 "Vite" 不是一个直接可用的选项，或者您想进行更细致的配置，可以选择 "None" 或手动配置。
-   **Build command:** (构建命令) 这是 Cloudflare 用来构建您的项目的命令。根据 `package.json` 文件中的 `scripts`，构建命令应该是：
    ```bash
    npm run build
    ```
    或者，如果您使用 `yarn`:
    ```bash
    yarn build
    ```
    *注意:* Chitchatter 的 `package.json` 中 `build`脚本是 `npm run build:app && npm run build:sdk`。 但 `build:sdk` 似乎是用于构建一个独立的 SDK，对于部署应用本身，`npm run build:app` 可能就足够了，它会执行 `vite build`。 您可以先尝试 `npm run build:app`。如果遇到问题，再尝试完整的 `npm run build`。
-   **Build output directory:** (构建输出目录) 这是构建命令执行后，静态文件所在的目录。对于 Vite 项目，默认的输出目录是 `dist`。请检查您的 `vite.config.ts` 文件确认。
-   **Root directory (optional):** (根目录 - 可选) 如果您的 `package.json` 和项目源文件不在仓库的根目录，您需要指定它们所在的路径。对于 Chitchatter，通常这些文件在根目录，所以此项可以留空。
-   **Environment variables (optional):** (环境变量 - 可选) 如果您的应用需要任何构建时或运行时的环境变量，您可以在这里添加它们。
    -   点击 "Add variable" 添加环境变量。
    -   例如，`VITE_HOMEPAGE` 在 `package.json` 中用于构建过程。Cloudflare Pages 通常会自动处理基于 Git 的部署路径，但如果需要，您可以在这里设置。
    -   **Node.js 版本:** 点击 "Environment Variables (advanced)"，您可以找到设置 Node.js 版本的选项。根据项目 `package.json` 中的 `"engines"` 字段 (`"node": "20.12.1"`), 您应该将 Node.js 版本设置为 `20.12.1` 或一个兼容的较新版本。Cloudflare Pages 默认可能使用较旧版本，设置正确的版本非常重要。

### 5. 保存并部署

-   仔细检查您的配置。
-   点击 "Save and Deploy" 按钮。
-   Cloudflare Pages 将开始拉取您的代码，安装依赖，执行构建命令，并将构建好的静态文件部署到其全球网络。
-   您可以在部署详情页面查看部署日志和状态。首次部署可能需要几分钟时间。

### 6. 访问您的部署

-   部署成功后，Cloudflare Pages 会为您提供一个唯一的 `*.pages.dev` 子域名 (例如 `your-project-name.pages.dev`)。
-   您可以通过此域名访问您部署的 Chitchatter 应用。

### 7. (可选) 配置自定义域名

如果您想使用自己的域名 (例如 `chitchatter.yourdomain.com` 或 `yourdomain.com`)：

-   在您的 Pages 项目概览页面，进入 "Custom domains" 标签页。
-   点击 "Set up a custom domain"。
-   按照屏幕上的指示添加您的域名。这通常涉及到在您的域名注册商处添加 CNAME 或 A 记录。Cloudflare 会提供具体的记录值。
-   Cloudflare 会自动为您的自定义域名配置 SSL/TLS 证书。

### 8. (可选) 查看和管理部署

-   在 Cloudflare Pages 控制台中，您可以查看所有部署历史、回滚到之前的版本、管理自定义域名、查看分析数据等。

## 故障排除

-   **构建失败:**
    -   仔细检查构建日志，找出错误原因。
    -   确保 "Build command" 和 "Build output directory" 配置正确。
    -   **Node.js 版本不匹配:** 这是常见问题。务必在环境变量中设置与项目 `package.json` 中 `"engines"` 字段匹配的 `NODE_VERSION`。例如，添加一个名为 `NODE_VERSION` 的环境变量，值为 `20.12.1`。
    -   **依赖问题:** 确保所有生产依赖都已正确列在 `package.json` 中。
-   **应用无法正常加载或功能异常:**
    -   打开浏览器开发者工具 (通常按 F12)，查看控制台是否有错误信息。
    -   检查网络请求，确保所有静态资源都已正确加载。
    -   确认环境变量是否已正确设置并传递给应用。对于 Vite 应用，只有以 `VITE_` 开头的环境变量才会嵌入到客户端代码中。

## 总结

通过以上步骤，您应该能够成功地将 Chitchatter 项目部署到 Cloudflare Pages。Cloudflare Pages 为静态应用提供了一个强大且易于使用的平台，让您可以专注于开发，而无需担心服务器管理。

祝您部署顺利！
