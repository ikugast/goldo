import { useState, useEffect, useCallback } from 'react';
import MasterChart from '../components/MasterChart';
import StrategyZone from '../components/StrategyZone';
import '../App.css';

type ChartPoint = {
  name: string;
  modelA: number | null;
  modelB: number | null;
  modelC: number | null;
  modelD: number | null;
};

type ModelView = {
  id: string;
  modelName: string;
  strategyName: string;
  netValue: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: any[];
  recentTrades: any[];
  aiReason: string;
  initialCash: number;
};

type RealtimeMetrics = {
  netValueRatio: number;
  cumulativeReturn: number;
  totalMarketValue: number;
};

// GitHub Pages 模式：直接读取仓库里的 JSON 数据文件
// 部署后，将 GITHUB_RAW_URL 改为你自己仓库的 Raw 地址，例如：
// https://raw.githubusercontent.com/你的用户名/gold-bean-sprout/main/simulation_output.json
const DATA_URL = '/goldo/simulation_output.json';
const BASELINE_DATE = new Date('2026-03-25');

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [modelsData, setModelsData] = useState<ModelView[]>([]);

  const fetchData = async () => {
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch simulation data');
      const data = await response.json();

      const models = data.models || {};
      const modelKeys = Object.keys(models);
      if (modelKeys.length === 0) {
        setChartData([]);
        setModelsData([]);
        setLoading(false);
        return;
      }

      const maxCurveLength = modelKeys.reduce((max, key) => {
        const curve = (models[key]?.net_value_curve || []) as number[];
        return Math.max(max, curve.length);
      }, 0);

      if (maxCurveLength === 0) {
        setChartData([]);
        setModelsData([]);
        setLoading(false);
        return;
      }

      const timestampRaw: string | undefined = data.common_data?.timestamp;
      let lastDate = BASELINE_DATE;
      if (timestampRaw) {
        const datePart = (timestampRaw as string).split(' ')[0];
        const parsed = new Date(datePart);
        if (!Number.isNaN(parsed.getTime())) {
          lastDate = parsed;
        }
      }

      const dates: Date[] = new Array(maxCurveLength);
      let cursor = new Date(lastDate);
      for (let i = maxCurveLength - 1; i >= 0; i--) {
        while (cursor.getDay() === 0 || cursor.getDay() === 6) {
          cursor.setDate(cursor.getDate() - 1);
        }
        dates[i] = new Date(cursor);
        cursor.setDate(cursor.getDate() - 1);
      }

      const filteredIndices: number[] = [];
      const baselineTime = BASELINE_DATE.getTime();
      for (let i = 0; i < dates.length; i++) {
        if (dates[i].getTime() >= baselineTime) {
          filteredIndices.push(i);
        }
      }

      const firstIndex = filteredIndices.length > 0 ? filteredIndices[0] : 0;

      const baselineMap: Record<string, number> = {};
      modelKeys.forEach((key) => {
        const curve = (models[key]?.net_value_curve || []) as number[];
        const base = curve[firstIndex] || 1;
        baselineMap[key] = base > 0 ? base : 1;
      });

      const seriesKeyMap: Record<string, 'modelA' | 'modelB' | 'modelC' | 'modelD'> = {
        'Model A': 'modelA',
        'Model B': 'modelB',
        'Model C': 'modelC',
        'Model D': 'modelD',
      };

      let formattedChartData: ChartPoint[] = [];

      if (filteredIndices.length > 0) {
        formattedChartData = filteredIndices.map((index) => {
          const d = dates[index];
          const label = `${d.getMonth() + 1}/${d.getDate()}`;
          const point: ChartPoint = {
            name: label,
            modelA: null,
            modelB: null,
            modelC: null,
            modelD: null,
          };

          Object.entries(seriesKeyMap).forEach(([modelId, seriesKey]) => {
            const curve = (models[modelId]?.net_value_curve || []) as number[];
            if (!curve || curve.length <= index) {
              point[seriesKey] = null;
              return;
            }
            const rawValue = curve[index];
            const base = baselineMap[modelId] || 1;
            const normalized = base > 0 ? rawValue / base : rawValue;
            point[seriesKey] = Number(normalized.toFixed(6));
          });

          return point;
        });
      }

      setChartData(formattedChartData);

      const displayNames: Record<string, string> = {
        'Model A': '模型 A',
        'Model B': '模型 B',
        'Model C': '模型 C',
        'Model D': '模型 D',
      };

      const formattedModels: ModelView[] = modelKeys.map((key) => {
        const m = models[key];
        const curve = (m.net_value_curve || []) as number[];
        const initialCash: number = m.initial_cash || 1000000;
        const base = baselineMap[key] || 1;
        const lastIndex = curve.length - 1;
        const rawCurrent = lastIndex >= 0 ? curve[lastIndex] : 1;
        const normalizedCurrent = base > 0 ? rawCurrent / base : rawCurrent;
        const cumulativeReturn = parseFloat(((normalizedCurrent - 1) * 100).toFixed(2));

        return {
          id: key,
          modelName: displayNames[key] || key,
          strategyName:
            m.strategy_type === 'TechnicalFlow'
              ? 'AI 算力核心池 (98只)'
              : '龙头战法 (热点异动捕捉)',
          netValue: Number(normalizedCurrent.toFixed(4)),
          cumulativeReturn,
          availableCash: m.cash || 0,
          holdingsCount: m.holdings.length,
          holdings: m.holdings,
          recentTrades: m.transactions.slice(-5),
          aiReason:
            m.holdings.length > 0
              ? m.holdings[0].reason
              : '正在扫描市场寻找最佳机会...',
          initialCash,
        };
      });

      setModelsData(formattedModels);
      setLoading(false);
    } catch (err: any) {
      setError(err.message ?? '加载仿真数据失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每 10 秒轮询一次后端导出的仿真数据
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRealtimeUpdate = useCallback(
    (modelId: string, metrics: RealtimeMetrics) => {
      // 更新模型卡片上的总收益率
      setModelsData((prev) =>
        prev.map((m) =>
          m && m.id === modelId ? { ...m, cumulativeReturn: metrics.cumulativeReturn } : m,
        ),
      );

      // 同步更新总净值曲线的最后一个点
      setChartData((prev) => {
        if (!prev || prev.length === 0) return prev;
        const seriesKeyMapLocal: Record<string, 'modelA' | 'modelB' | 'modelC' | 'modelD'> = {
          'Model A': 'modelA',
          'Model B': 'modelB',
          'Model C': 'modelC',
          'Model D': 'modelD',
        };
        const seriesKey = seriesKeyMapLocal[modelId];
        if (!seriesKey) return prev;

        const next = [...prev];
        const lastIndex = next.length - 1;
        const lastPoint = next[lastIndex];
        if (!lastPoint) return prev;

        next[lastIndex] = {
          ...lastPoint,
          [seriesKey]: Number(metrics.netValueRatio.toFixed(6)),
        };
        return next;
      });
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500">
        加载仿真数据中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        错误: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img
              src="/logo.png"
              className="w-12 h-12 rounded-full border-2 border-purple-100 shadow-sm"
              alt="logo"
            />
            <div>
              <h1 className="text-2xl font-serif-quant font-bold text-gray-900 leading-none flex items-center">
                金豆芽 <span className="mx-2 text-gray-400 font-light text-xl">-</span>{' '}
                <span className="text-lg text-gray-500 font-normal">AI模拟交易</span>
              </h1>
              <div className="mt-1 flex flex-col space-y-0.5">
                <span className="text-xs text-purple-600 font-mono-quant italic opacity-80">
                  a bet at a time
                </span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-xs font-medium text-gray-500">
            <span className="hover:text-purple-600 cursor-pointer">净值曲线</span>
            <span className="hover:text-purple-600 cursor-pointer">技术流</span>
            <span className="hover:text-purple-600 cursor-pointer">龙头战法</span>
            <a
              href="#/admin"
              className="hover:text-purple-600 cursor-pointer underline-offset-4 hover:underline"
            >
              管理后台
            </a>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">
              系统运行中
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-8 sm:px-6 sm:mt-8 sm:space-y-12">
        {/* Top: Master Chart */}
        <section>
          <MasterChart data={chartData} />
        </section>

        {/* 技术流模块 */}
        <section>
          <StrategyZone
            title="技术流"
            description="聚焦算力核心资产，AI结合趋势动量进行模拟交易。"
            models={[
              modelsData.find((m) => m.id === 'Model A') as ModelView,
              modelsData.find((m) => m.id === 'Model B') as ModelView,
            ]}
            onRealtimeUpdate={handleRealtimeUpdate}
          />
        </section>

        {/* 龙头战法模块 */}
        <section>
          <StrategyZone
            title="龙头战法"
            description="捕捉市场热点情绪，AI进行短线决策模拟交易"
            models={[
              modelsData.find((m) => m.id === 'Model C') as ModelView,
              modelsData.find((m) => m.id === 'Model D') as ModelView,
            ]}
            onRealtimeUpdate={handleRealtimeUpdate}
          />
        </section>

        {/* 页脚信息 */}
        <footer className="pt-12 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 font-mono-quant">© 2026 金豆芽实验室. v0.1</p>
          <p className="text-[10px] text-gray-300 mt-2 italic">
            仿真环境不涉及真实资金，AI 决策仅供研究参考。
          </p>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
