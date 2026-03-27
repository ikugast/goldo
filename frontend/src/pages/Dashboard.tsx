import React, { useEffect, useState } from 'react';
import MasterChart from '../components/MasterChart';
import ModelCard from '../components/ModelCard';
import TradeList from '../components/TradeList';

interface Holding {
  code: string;
  name: string;
  amount: number;
  average_cost: number;
  current_price: number;
  profit_rate: number;
  daily_change_pct?: number;
}

interface AccountData {
  name: string;
  net_value: number;
  cash: number;
  holdings: Holding[];
  history_transactions: any[];
  net_value_curve: number[];
}

interface SimulationData {
  accounts: {
    [key: string]: AccountData;
  };
}

const COLORS = ['#8A2BE2', '#FF6B6B', '#00B894', '#0984E3'];
const INITIAL_CASH = 1000000;

export default function Dashboard() {
  const [data, setData] = useState<SimulationData | null>(null);

  const fetchSimulationData = async () => {
    try {
      // 强制添加时间戳避免缓存
      const response = await fetch(`/simulation_output.json?t=${new Date().getTime()}`);
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  useEffect(() => {
    fetchSimulationData();
  }, []);

  if (!data) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const accounts = Object.values(data.accounts);

  // === 核心修复点：强制计算实时净值以对齐图表和卡片 ===
  const modelMetrics = accounts.map(acc => {
    // 1. 按照卡片逻辑重新计算当前持仓总市值
    const totalMarketValue = acc.holdings.reduce((sum, h) => sum + (h.amount * h.current_price), 0);
    // 2. 当前总资产 = 可用现金 + 最新市值
    const currentTotalAssets = acc.cash + totalMarketValue;
    // 3. 严格计算总收益率 (单位 %)，和 ModelCard 一样
    const cumulativeReturn = ((currentTotalAssets / INITIAL_CASH) - 1) * 100;
    // 4. 计算当前“真实净值” (用于图表最后一个点)
    const realNetValue = currentTotalAssets / INITIAL_CASH;

    return {
      acc,
      totalMarketValue,
      cumulativeReturn,
      realNetValue
    };
  });

  // 组装图表数据
  const lines = accounts.map((acc, index) => ({
    key: `model_${index}`,
    name: acc.name,
    color: COLORS[index % COLORS.length],
  }));

  // 生成最近几天的数据点
  // 为了确保最后一天绝对准确，我们将最后一天的数据直接替换为上面计算出的 realNetValue
  const maxDays = Math.max(...accounts.map(a => a.net_value_curve?.length || 0));
  const baseDate = new Date('2026-03-25T00:00:00'); // 起点
  
  const chartData = Array.from({ length: maxDays }).map((_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
    
    const point: any = { date: dateStr };
    
    modelMetrics.forEach((metric, index) => {
      const curve = metric.acc.net_value_curve || [];
      const isLastPoint = i === maxDays - 1;
      
      // 如果是最后一天，强制使用卡片口径算出的净值，否则用历史值
      if (isLastPoint) {
        point[`model_${index}`] = Number(metric.realNetValue.toFixed(4));
      } else {
        // 如果天数不够，用1.0补齐，存在则取历史值
        point[`model_${index}`] = i < curve.length ? Number(curve[i].toFixed(4)) : 1.0;
      }
    });
    return point;
  });

  // 提取所有的交易记录，按照时间倒序排序
  const allTrades = accounts.flatMap(acc =>
    (acc.history_transactions || []).map(t => ({
      ...t,
      accountName: acc.name,
      amount: t.amount,
      price: t.price
    }))
  ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24">
      {/* 顶部 Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">金豆芽 - AI模拟交易</h1>
          <p className="text-xs text-gray-500 mt-1">a bet at a time</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 1. 主收益图表 */}
        <MasterChart data={chartData} lines={lines} />

        {/* 2. 策略说明 */}
        <div className="bg-[#1A1A1A] rounded-[24px] p-6 text-white shadow-lg">
          <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs mb-3">技术流</div>
          <h3 className="text-lg font-bold mb-2">聚焦算力核心资产，AI结合趋势动量进行模拟交易</h3>
        </div>

        {/* 3. 模型卡片 */}
        {modelMetrics.map((metric, i) => (
          <ModelCard
            key={i}
            modelName={metric.acc.name}
            strategyName="技术趋势"
            netValue={metric.realNetValue}
            cumulativeReturn={metric.cumulativeReturn}
            availableCash={metric.acc.cash}
            holdingsCount={metric.acc.holdings.length}
            holdings={metric.acc.holdings.map(h => ({
              code: h.code,
              name: h.name,
              count: h.amount,
              avgCost: h.average_cost,
              currentPrice: h.current_price,
              profitRate: h.profit_rate,
              dailyChangePct: h.daily_change_pct || 0,
              reason: "AI决策"
            }))}
          />
        ))}

        {/* 4. 最近交易 */}
        <TradeList trades={allTrades} />
      </div>
    </div>
  );
}
