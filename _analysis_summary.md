
# 项目结构要点与关键入口文件

## 一、项目识别

- **项目类型**: 全栈项目。
  - **前端**: React + Vite + TypeScript, 使用 Tailwind CSS。
  - **后端**: Python + Flask。
- **包管理器**: 前端使用 `pnpm` (根据 `frontend/pnpm-lock.yaml` 文件判断)。

## 二、源码结构梳理

### 1. 前端路由 (`project/frontend/src/App.tsx`)

- 使用 `react-router-dom` 的 `HashRouter`。
- **主页路由**: `path="/"`, 加载 `<Dashboard />` 组件。
- **管理后台路由**: `path="/admin"`, 加载 `<Admin />` 组件。路由已存在。

### 2. 模型卡片组件 (`project/frontend/src/components/ModelCard.tsx`)

- 负责展示单个AI模型（如 模型A、模型B）的详细数据。
- 包含总收益率、可用现金、持仓数量、市值、当前持仓列表、最近交易记录等。
- 内含一个定时器逻辑 `fetchRealQuotes` 用于获取实时行情，当前每小时触发一次。

### 3. 交易记录存储位置

- **前端数据源**:
  - `<Dashboard />` (`project/frontend/src/pages/Dashboard.tsx`) 通过 `fetch` 请求 `/simulation_output.json` 来获取所有展示数据，包括交易记录。
- **后端数据生成**:
  - `project/backend/engine.py` 中的 `export_frontend_data` 方法负责将模拟器的当前状态序列化为 `simulation_output.json` 文件。
- **后端持久化存储**:
  - 核心状态（包括账户、持仓、完整的交易订单 `orders`）被保存在 `project/backend/engine_state.json` 文件中。
  - **结论**: 交易记录的真实来源是后端的 `engine_state.json` 文件。

### 4. 图表组件 (`project/frontend/src/components/MasterChart.tsx`)

- 使用 `recharts` 库来绘制所有模型的净值（Net Value）曲线。
- 数据来源于父组件 `<Dashboard />` 传递的 `data` prop。

### 5. 净值图时间轴逻辑 (`project/frontend/src/pages/Dashboard.tsx`)

- 在 `fetchData` 函数中，通过硬编码从 `'2026-03-24'` 开始生成日期序列。
- 强制在数据头部插入一个 `{ name: '3/23', ... }` 的数据点作为净值 `1.0` 的基线原点。

## 三、关键入口文件列表

- **前端**:
  - `project/frontend/src/main.tsx`: React 应用渲染的根入口。
  - `project/frontend/src/App.tsx`: 应用级组件，定义了前端路由。
  - `project/frontend/src/pages/Dashboard.tsx`: 主仪表盘页面，负责核心数据获取与分发。
  - `project/frontend/src/pages/Admin.tsx`: 管理后台页面。
  - `project/frontend/src/components/ModelCard.tsx`: 模型卡片UI组件。
  - `project/frontend/src/components/MasterChart.tsx`: 净值曲线图UI组件。

- **后端**:
  - `project/backend/main.py`: 后端服务和定时任务的总入口。
  - `project/backend/admin_api.py`: 提供了所有 Flask API 路由，如数据获取、系统重置等。
  - `project/backend/engine.py`: 核心的 `MirrorDecisionEngine` 类，是AI决策和模拟交易的“大脑”。
  - `project/backend/simulator.py`: `AShareSimulator` 类，处理买卖、资金、持仓、杠杆等底层模拟逻辑。
  - `project/backend/scheduler.py`: 定义了交易日的定时决策任务（开盘、午间、尾盘）。
  - `project/backend/real_market.py`: `get_real_quotes` 函数，用于从外部API获取实时股票价格。
  - `project/backend/engine_state.json`: **[数据文件]** 持久化存储所有账户和交易的核心状态。
  - `project/backend/simulation_output.json`: **[数据文件]** 为前端生成和提供的展示用数据。
