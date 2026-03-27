import { useState, useEffect } from 'react';
import MasterChart from '../components/MasterChart';
import StrategyZone from '../components/StrategyZone';
import '../App.css';

// 统一口径：模型卡片净值与图表净值都以该初始资金为准
const INITIAL_CASH = 1_000_000;

const toNumber = (v: unknown, fallback = 0) => {
  const n = v === null || v === undefined ? NaN : (typeof v === "number" ? v : Number(v));
  return Number.isFinite(n) ? n : fallback;
};

const toFixedNumber = (v: unknown, digits: number, fallback = 0) => {
  const n = toNumber(v, NaN);
  return Number.isFinite(n) ? parseFloat(n.toFixed(digits)) : fallback;
};

const isRecord = (v: unknown): v is Record<string, any> => {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
};

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const DATA_URL =
  (import.meta as any).env?.VITE_DATA_URL ||
  `${import.meta.env.BASE_URL}simulation_output.json`;

type SimulationModel = {
  net_value_curve?: number[];
  cash?: number;
  initial_cash?: number;
  holdings?: any[];
  transactions?: any[];
  strategy_type?: string;
  name?: string;
};

const extractModels = (raw: any): Record<string, SimulationModel> => {
  if (isRecord(raw?.models)) return raw.models;
  if (isRecord(raw?.data?.models)) return raw.data.models;

  const accounts =
    (isRecord(raw?.accounts) && raw.accounts) ||
    (isRecord(raw?.data?.accounts) && raw.data.accounts) ||
    (isRecord(raw?.simulator?.accounts) && raw.simulator.accounts) ||
    (isRecord(raw?.data?.simulator?.accounts) && raw.data.simulator.accounts);

  if (!isRecord(accounts)) return {};

  const models: Record<string, SimulationModel> = {};
  for (const [key, acc] of Object.entries(accounts)) {
    const history = asArray<number>((acc as any)?.history || (acc as any)?.net_value_curve);
    const orders = asArray<any>((acc as any)?.orders || (acc as any)?.transactions);
    
    let holdingsArray: any[] = [];
    if (Array.isArray((acc as any)?.holdings)) {
      holdingsArray = (acc as any).holdings;
    } else if (isRecord((acc as any)?.positions)) {
      holdingsArray = Object.values((acc as any).positions);
    }

    models[key] = {
      net_value_curve: history,
      cash: toNumber((acc as any)?.cash, 0),
      initial_cash: toNumber((acc as any)?.initial_cash, INITIAL_CASH),
      holdings: holdingsArray.map((p: any) => ({
        name: String(p?.name ?? p?.code ?? ''),
        code: String(p?.code ?? ''),
        count: toNumber(p?.volume ?? p?.amount ?? p?.count, 0),
        avgCost: toNumber(p?.cost_price ?? p?.avgCost, 0),
        currentPrice: toNumber(p?.cost_price ?? p?.currentPrice ?? p?.current_price, 0),
        profitRate: toNumber(p?.profitRate ?? p?.profit_rate, 0),
        // 修复 TS2345: 把 null 换成 0 或者保留 undefined，这里给 0
        dailyChangePct: toNumber(p?.dailyChangePct ?? p?.daily_change_pct, 0),
        reason: String(p?.reason ?? p?.logic ?? '')
      })),
      transactions: orders.map((o: any) => ({
        name: String(o?.name ?? o?.code ?? ''),
        code: String(o?.code ?? ''),
        amount: toNumber(o?.volume ?? o?.amount, 0),
        direction: String(o?.direction ?? '').toUpperCase() === 'SELL' ? 'sell' : 'buy',
        price: toNumber(o?.price, 0),
        time: String(o?.time ?? ''),
        logic: String(o?.logic ?? o?.reason ?? '')
      })),
      strategy_type: String((acc as any)?.strategy_type ?? '')
    };
  }

  return models;
};

type FormattedModel = {
  id: string;
  modelName: string;
  strategyName: string;
  netValue: number;
  netValueRaw: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: any[];
  recentTrades: any[];
  aiReason: string;
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartSeries, setChartSeries] = useState<any[]>([]);
  const [modelsByStrategy, setModelsByStrategy] = useState<Record<string, any[]>>({});

  const fetchData = async () => {
    try {
      const response = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch simulation data');
      const raw = await response.json();
      
      // 移除未使用的 data 变量，修复 TS6133
      const models = extractModels(raw);
      const modelKeys = Object.keys(models);

      const curveLength = modelKeys.reduce((max, key) => {
        const len = models[key]?.net_value_curve?.length ?? 0;
        return Math.max(max, len);
      }, 0);

      const formatModelName = (id: string) => {
        const m = /^Model\s+(.+)$/i.exec(id);
        if (m?.[1]) return `模型 ${m[1]}`;
        return id;
      };

      const formatStrategyName = (strategyType?: string) => {
        if (!strategyType) return '策略';
        if (strategyType === 'TechnicalFlow') return '技术流';
        if (strategyType === 'LeadingDragon') return '龙头战法';
        return strategyType;
      };

      const formattedModels: FormattedModel[] = modelKeys.flatMap((key) => {
        const m = models[key];
        if (!m) return [];
        
        const holdings = asArray<any>(m.holdings);
        const transactions = asArray<any>(m.transactions);

        const curve = asArray<number>(m.net_value_curve);
        const curveNums = curve.map((x) => toNumber(x, NaN)).filter((x) => Number.isFinite(x));
        const curveMax = curveNums.length ? Math.max(...curveNums) : 1;
        const curveScale = curveMax > 50 ? INITIAL_CASH : 1;
        const lastCurve = curveNums.length ? curveNums[curveNums.length - 1] / curveScale : NaN;

        const totalMarketValue = holdings.reduce((sum: number, h: any) => {
          return sum + toNumber(h?.count, 0) * toNumber(h?.currentPrice, 0);
        }, 0);
        const currentEquity = toNumber(m.cash, 0) + totalMarketValue;
        const currentNetValueRatioRaw = currentEquity / INITIAL_CASH;
        const currentNetValueRatioFallback = Number.isFinite(currentNetValueRatioRaw) ? currentNetValueRatioRaw : 1;
        const currentNetValueRatio = Number.isFinite(lastCurve) ? lastCurve : currentNetValueRatioFallback;

        return [{
          id: key, 
          modelName: formatModelName(key),
          strategyName: formatStrategyName(m.strategy_type),
          netValue: toFixedNumber(currentNetValueRatio, 4, 1),
          cumulativeReturn: toFixedNumber((currentNetValueRatio - 1) * 100, 2, 0),
          netValueRaw: currentNetValueRatio,
          availableCash: toNumber(m.cash, 0),
          holdingsCount: holdings.length,
          holdings,
          recentTrades: transactions.slice(-5),
          aiReason: holdings.length > 0 ? (holdings[0]?.reason ?? "") : "正在扫描市场寻找最佳机会..."
        }];
      });

      const nextSeries = modelKeys.map((id, idx) => {
        const palette = ['#8A4FFF', '#FF4D4F', '#00B894', '#1890FF', '#FAAD14', '#722ED1'];
        return {
          key: `model_${idx}`, // 为了兼容 MasterChart 的 lines
          dataKey: id,         // 保留 dataKey
          name: formatModelName(id),
          color: palette[idx % palette.length]
        };
      });

      const grouped: Record<string, any[]> = {};
      for (const m of formattedModels) {
        const k = m?.strategyName || '策略';
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(m);
      }

      const baseDate = new Date('2026-03-25T00:00:00');
      const safeCurveLength = curveLength > 0 ? curveLength : 1;
      
      const formattedChartData = Array.from({ length: safeCurveLength }).map((_, i) => {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        const row: any = { name: `${d.getMonth() + 1}/${d.getDate()}` };
        
        for (const id of modelKeys) {
          const fm = formattedModels.find(m => m.id === id);
          const finalNV = fm?.netValueRaw ?? 1.0;
          
          if (i === safeCurveLength - 1) {
            row[id] = finalNV;
          } else {
             const val = models[id]?.net_value_curve?.[i];
             row[id] = Number.isFinite(val) ? val : 1.0;
          }
        }
        return row;
      });

      setChartData(formattedChartData);
      setChartSeries(nextSeries);
      setModelsByStrategy(grouped);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-500">加载仿真数据中...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">错误: {error}</div>;

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-20">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src={`${import.meta.env.BASE_URL}logo.png`} className="w-12 h-12 rounded-full border-2 border-purple-100 shadow-sm" alt="logo" />
            <div className="flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-serif-quant font-bold text-gray-900 leading-tight flex flex-wrap items-center">
                <span>金豆芽</span>
                <span className="mx-1.5 sm:mx-2 text-gray-400 font-light text-lg sm:text-xl">-</span>
                <span className="text-base sm:text-lg text-gray-500 font-normal">AI模拟交易</span>
              </h1>
              <div className="mt-0.5">
                <span className="text-[11px] sm:text-xs text-purple-600 font-mono-quant italic opacity-80 block">a bet at a time</span>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-xs font-medium text-gray-500">
            <span className="hover:text-purple-600 cursor-pointer">净值曲线</span>
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px]">系统运行中</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-8 sm:px-6 sm:mt-8 sm:space-y-12">
        <section>
          {/* 修复 TS2322: 兼容 lines 和 series 两种可能 */}
          <MasterChart data={chartData} lines={chartSeries} series={chartSeries} />
        </section>

        {Object.entries(modelsByStrategy).map(([strategy, models]) => (
          <section key={strategy}>
            <StrategyZone
              title={strategy}
              description={strategy === '技术流' ? '聚焦算力核心资产，AI 结合趋势动量进行模拟交易。' : strategy === '龙头战法' ? '捕捉市场热点情绪，AI 进行短线决策模拟交易。' : '基于后端输出策略展示。'}
              models={Array.isArray(models) ? models : []}
            />
          </section>
        ))}

        <footer className="pt-12 pb-12 sm:pb-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 font-mono-quant">© 2026 金豆芽实验室. v0.1</p>
          <p className="text-[10px] text-gray-300 mt-2 italic">仿真环境不涉及真实资金，AI 决策仅供研究参考。</p>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
