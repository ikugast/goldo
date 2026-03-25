# 项目文件改动清单

## 一、新增文件

### `project/_analysis_summary.md`
- 梳理了项目整体结构与关键入口，包括：前后端技术栈、路由配置、模型卡片组件、交易记录存储位置以及净值图时间轴逻辑等。

### `project/_changed_files.md`
- 记录本次改动涉及的所有新增/修改文件及对应说明（即本文）。

## 二、修改文件

### 1. 后端 (`project/backend/`)

#### `project/backend/simulator.py`
- **去杠杆改造**：
  - 从 `Account` 类中完全移除了 `leverage` 属性及其构造参数，不再在账户状态中持久化杠杆信息。
  - 将 `total_buying_power` 属性改为直接返回当前可用现金 `self.cash`，不再使用 `1 + leverage` 的倍数放大买入能力。
  - 重写 `can_buy` 方法的风控逻辑，取消“买入能力 = 杠杆×净资产”的校验，统一改为“买入成本不能超过当前可用现金”。

#### `project/backend/engine.py`
- **导出数据结构同步去杠杆**：
  - 在 `export_frontend_data` 中移除了 `common_data` 下的 `"leverage": "1x"` 字段，仅保留 `timestamp`，确保前端展示与真实交易规则均为无杠杆模式。

#### `project/backend/simulation_output.json`
- **示例数据结构调整**：
  - 从 `common_data` 中删除 `leverage` 字段，使样例文件与新的导出结构保持一致。

### 2. 前端 (`project/frontend/`)

#### `project/frontend/public/simulation_output.json`
- **静态资源结构同步**：
  - 与后端样例保持一致，从 `common_data` 中删除 `leverage` 字段，避免前端误读杠杆配置。

#### `project/frontend/src/components/MasterChart.tsx`
- **净值图时间标签优化**：
  - 将无数据时的默认起止标签由 `3/24 → --` 调整为 `3/25 → 3/25`，与新的基线日期保持一致。

#### `project/frontend/src/pages/Dashboard.tsx`
- **净值图时间轴和基线逻辑重构**：
  - 使用后端 `common_data.timestamp` 作为最后一个净值点日期，按交易日（跳过周末）反推整条净值曲线的日期序列。
  - 引入常量 `BASELINE_DATE = 2026-03-25`，过滤并丢弃该日期之前的所有净值记录，实现“从 2026-03-25 起展示”的要求。
  - 以首个保留数据点为基准，将各模型净值曲线统一基准化为从 1.0 起步，确保净值图和收益率的统计口径一致。
- **模型视图数据统一基准化**：
  - 在构建 `modelsData` 时，根据新的基线重新计算每个模型的当前净值比率和累计收益率 `cumulativeReturn`。
  - 为每个模型增加 `initialCash` 字段，用于后续实时净值计算（结合实时持仓市值）。
- **实时刷新总净值图**：
  - 新增 `handleRealtimeUpdate(modelId, metrics)` 回调，用于接收模型卡片上报的实时净值比率、收益率和市值。
  - 在回调中同步更新：
    - `modelsData` 中对应模型的 `cumulativeReturn`；
    - `chartData` 中对应模型曲线最后一个点的净值值（`modelA`/`modelB`/`modelC`/`modelD`）。
- **管理后台入口补全**：
  - 在页面右上角导航栏增加“管理后台”链接，指向 `#/admin`，方便在 HashRouter 模式下直接进入管理员页面。

#### `project/frontend/src/components/StrategyZone.tsx`
- **模型数据结构扩展与回调透传**：
  - 扩展 `ModelData` 接口，增加 `id` 与 `initialCash` 字段，以支持实时净值计算。
  - 新增可选属性 `onRealtimeUpdate`，并将其透传给内部的 `ModelCard`，形成从模型卡片到 Dashboard 的实时数据上报路径。

#### `project/frontend/src/components/ModelCard.tsx`
- **交易时段定时器与实时行情刷新**：
  - 新增 `isShanghaiTradingTime` 工具函数，通过 `Intl.DateTimeFormat` 在 `Asia/Shanghai` 时区下判断当前时间是否处于 A 股交易时段（工作日 9:30–11:30、13:00–15:00）。
  - 将原先每小时刷新一次行情的定时器改为：
    - 每分钟 (`60 * 1000` ms) 执行一次 `tick`；
    - `tick` 内部先判断是否在交易时段，仅在交易时段内调用 `/api/market-quote` 接口获取实时行情；
    - 非交易时段不发起请求，相当于“自动暂停”。
- **模型卡片内收益、市值实时更新**：
  - 新增本地状态 `displayCumulativeReturn`，用于展示基于实时行情重新计算后的总收益率。
  - 在每次成功获取行情后：
    - 按实时价格重新计算当前持仓市值 `totalMarketValue`；
    - 使用 `totalNetAsset = availableCash + totalMarketValue` 与 `initialCash` 计算当前净值比率和总收益率；
    - 更新卡片上的“总收益率”和“市值”展示，更贴近实时行情。
- **向上汇报实时净值用于驱动总净值图**：
  - 通过可选回调 `onRealtimeUpdate` 将 `{ netValueRatio, cumulativeReturn, totalMarketValue }` 连同 `modelId` 上报给父组件。
  - Dashboard 利用该回调对总净值图的最新数据点进行实时更新，满足“总图表净值实时刷新”的需求。
- **错误防护**：
  - 对行情请求增加 `try...catch`，当外部行情接口异常时记录错误日志但不中断页面渲染，避免页面崩溃。

### 3. 构建产物 (`project/frontend/dist/`)

- 在完成前端代码修改后重新执行 `pnpm run build`，生成了最新的生产构建产物（`dist/` 目录），其中包含上述前端所有改动。
