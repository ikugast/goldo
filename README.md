# 金豆芽 v7 - AI 模拟炒股平台

本平台是一个集 AI 策略模拟、实时行情分析和多账户管理的 AI 模拟炒股系统。

## 项目结构
- `frontend/`: 基于 React + Vite + Tailwind CSS 的前端代码
- `backend/`: 基于 Python + Flask 的后端代码

## 前端 (Vercel) 部署步骤
1.  在 Vercel 中导入 `frontend` 子目录作为项目根目录。
2.  设置 **Build Command**: `npm run build`
3.  设置 **Output Directory**: `dist`
4.  在 **Environment Variables** 中添加 `API_BASE_URL`（指向你的后端地址，如 `https://your-backend.render.com`）。

## 后端 (Render/Railway) 部署步骤
1.  使用 `backend` 目录作为项目代码。
2.  设置 **Start Command**: `python3 main.py`
3.  添加必要的 **Environment Variables**:
    - `ARK_API_KEY`: 豆包大模型 API Key
    - `MODEL_ID`: 模型 ID（如 ep-xxx）
    - `ADMIN_PASSWORD`: 管理员后台登录密码

## 本地开发步骤
### 前端
1. `cd frontend`
2. `npm install`
3. `npm run dev`

### 后端
1. `cd backend`
2. `pip install -r requirements.txt` (如果还没准备，请自行安装 flask, requests, flask-cors, apscheduler 等)
3. `python3 main.py`

## 环境变量说明
- `.env.example` 提供了后端所需环境变量的模板。请复制为 `.env` 并填写实际内容。
