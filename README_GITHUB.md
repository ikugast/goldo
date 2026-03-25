# 金豆芽 v7 - GitHub 自动交易部署方案

这是一个完全“零成本、零权限”的部署方案，利用 GitHub Actions 运行 AI 决策，利用 GitHub Pages 展示结果。

## 🚀 部署步骤

### 1. 创建 GitHub 仓库
在 GitHub 上创建一个新的公开或私有仓库，命名为 `gold-bean-sprout`。

### 2. 上传代码
将本压缩包内的所有文件解压并推送到仓库：
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/你的用户名/gold-bean-sprout.git
git push -u origin main
```

### 3. 配置 GitHub Secrets (必须)
在 GitHub 仓库页面，点击 **Settings -> Secrets and variables -> Actions**，点击 **New repository secret**，添加以下 4 个密钥：
- `ARK_API_KEY_SEED`: 你的 Seed 模型 API Key
- `ARK_ENDPOINT_SEED`: 你的 Seed 模型 Endpoint ID (ep-xxx)
- `ARK_API_KEY_DEEPSEEK`: 你的 DeepSeek 模型 API Key
- `ARK_ENDPOINT_DEEPSEEK`: 你的 DeepSeek 模型 Endpoint ID (ep-xxx)

**重要：配置 Workflow 写入权限**
1. 在 **Settings -> Actions -> General** 中。
2. 找到 **Workflow permissions**。
3. 选择 **Read and write permissions**。
4. 点击 **Save**。 (这样 GitHub Action 才能将交易结果保存回仓库)

### 4. 开启 GitHub Pages
1. 在 **Settings -> Pages** 中：
   - Build and deployment -> Source: 选择 **GitHub Actions**。
2. 在 **Actions** 页面，找到 **pages-build-deployment** 流程，等待其运行完成。
3. 你的网站地址通常是 `https://你的用户名.github.io/gold-bean-sprout/`。

### 5. 定时任务说明
代码已在 `.github/workflows/trading.yml` 中配置好。GitHub 服务器会每天在以下时间自动运行：
- **09:30** (开盘)
- **13:00** (午盘)
- **14:30** (尾盘)

由于 GitHub 定时任务可能有 5-10 分钟延迟，这是正常现象。

---

## 📱 App 安装 (PWA 模式)
1. 部署完成后，在手机 Chrome 或 Safari 浏览器中打开你的 GitHub Pages 网址。
2. 点击浏览器的“分享”或“菜单”按钮。
3. 选择 **“添加到主屏幕” (Add to Home Screen)**。
4. 现在你的手机桌面上就有了一个像原生 App 一样的“金豆芽”图标，点击即看实时收益。

---
© 2026 金豆芽实验室. 白嫖 GitHub 方案版.
