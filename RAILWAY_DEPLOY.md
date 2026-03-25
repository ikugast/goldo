# Railway 部署指南

1. 前往 [railway.app](https://railway.app/) 注册/登录。
2. 点击 **New Project** → **Deploy from GitHub repo**（或者选择 **Upload ZIP** 并上传本项目的压缩包）。
3. 在 Railway 项目的 Variables（环境变量）里添加：
   - `ARK_API_KEY` = 你的火山引擎 API Key
   - `MODEL_ID` = 你的模型 ID（如果环境变量名为 `ARK_ENDPOINT_ID` 则添加对应内容，见 `.env.example`）
   - `ADMIN_PASSWORD` = zt1998（如果代码有验证的话，或者自定义）
4. 部署完成后，在项目面板的 **Settings** → **Networking** 区域，点击 **Generate Domain** 获取一个公网域名。
5. 通过该公网域名即可访问服务（前端页面及后端 API）。

> **提示**：如果使用 ZIP 部署或 GitHub 代码部署，确保项目根目录的 `Procfile` 和 `railway.toml` 存在，且前端已被打包至 `frontend/dist`。