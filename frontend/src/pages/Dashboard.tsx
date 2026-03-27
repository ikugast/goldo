import { useEffect, useState } from 'react';
import MasterChart from '../components/MasterChart';
import ModelCard from '../components/ModelCard';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  const fetchSimulationData = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}simulation_output.json?t=${new Date().getTime()}`);
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

  // 加上防白屏保护，防止 json 结构变化导致崩溃
  const accounts = Object.values(data.accounts || data.models || {});

  const COLORS = ['#8A2BE2', '#FF6B6B', '#00B894', '#0984E3'];
  const INITIAL_CASH = 1000000;

  const modelMetrics = accounts.map((acc: any) => {
    const safeHoldings = Array.isArray(acc.holdings) ? acc.holdings : [];
    const totalMarketValue = safeHoldings.reduce((sum, h) => sum + (h.amount * h.current_price), 0);
    const currentTotalAssets = acc.cash + totalMarketValue;
    const cumulativeReturn = ((currentTotalAssets / INITIAL_CASH) - 1) * 100;
    const realNetValue = currentTotalAssets / INITIAL_CASH;

    return {
      acc,
      totalMarketValue,
      cumulativeReturn,
      realNetValue
    };
  });

  const lines = accounts.map((acc: any, index: number) => ({
    key: `model_${index}`,
    name: acc.name,
    color: COLORS[index % COLORS.length],
  }));

  const maxDays = Math.max(...accounts.map((a: any) => (a.net_value_curve || []).length));
  const baseDate = new Date('2026-03-25T00:00:00');
  
  const chartData = Array.from({ length: maxDays }).map((_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const point: any = { date: `${d.getMonth() + 1}/${d.getDate()}` };
    
    modelMetrics.forEach((metric, index) => {
      const curve = metric.acc.net_value_curve || [];
      const isLastPoint = i === maxDays - 1;
      
      if (isLastPoint) {
        point[`model_${index}`] = Number(metric.realNetValue.toFixed(4));
      } else {
        point[`model_${index}`] = i < curve.length ? Number(curve[i].toFixed(4)) : 1.0;
      }
    });
    return point;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-24">
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">金豆芽 - AI模拟交易</h1>
          <p className="text-xs text-gray-500 mt-1">a bet at a time</p>
        </div>
      </div>
      <div className="p-4 space-y-6">
        <MasterChart data={chartData} lines={lines} />
        
        {modelMetrics.map((metric, i) => (
          <ModelCard
            key={i}
            modelName={metric.acc.name}
            strategyName="技术趋势"
            netValue={metric.realNetValue}
            cumulativeReturn={metric.cumulativeReturn}
            availableCash={metric.acc.cash}
            holdingsCount={(metric.acc.holdings || []).length}
            holdings={(metric.acc.holdings || []).map((h: any) => ({
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
      </div>
    </div>
  );
}
