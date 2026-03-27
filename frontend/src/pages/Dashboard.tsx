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
    const totalMarketValue = safeHoldings.reduce((sum: any, h: any) => sum + ((h.amount || h.count || 0) * (h.current_price || h.currentPrice || 0)), 0);
    const currentTotalAssets = (acc.cash || 0) + totalMarketValue;
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
    name: acc.name || `Model ${index}`,
    color: COLORS[index % COLORS.length],
  }));

  const maxDays = Math.max(...accounts.map((a: any) => (a.net_value_curve || []).length));
  const baseDate = new Date('2026-03-25T00:00:00');
  
  const chartData = Array.from({ length: maxDays > 0 ? maxDays : 1 }).map((_, i) => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const point: any = { date: `${d.getMonth() + 1}/${d.getDate()}` };
    
    modelMetrics.forEach((metric, index) => {
      const curve = metric.acc.net_value_curve || [];
      const isLastPoint = i === (maxDays > 0 ? maxDays - 1 : 0);
      
      if (isLastPoint) {
        point[`model_${index}`] = Number.isFinite(metric.realNetValue) ? Number(metric.realNetValue.toFixed(4)) : 1.0;
      } else {
        const val = curve[i];
        point[`model_${index}`] = (i < curve.length && Number.isFinite(val)) ? Number(val.toFixed(4)) : 1.0;
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

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {/* 全局走势图 */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">大盘趋势跑赢测试</h2>
            <p className="text-sm text-gray-500 mt-1">实时追踪各模型净值表现</p>
          </div>
          <MasterChart data={chartData} lines={lines} />
        </div>

        {/* 模型卡片列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modelMetrics.map((metric, i) => (
            <ModelCard 
              key={i}
              modelName={metric.acc.name || `策略模型 ${i+1}`}
              strategyName="AI量化"
              netValue={Number.isFinite(metric.realNetValue) ? metric.realNetValue : 1.0}
              cumulativeReturn={Number.isFinite(metric.cumulativeReturn) ? metric.cumulativeReturn : 0}
              availableCash={metric.acc.cash || 0}
              holdingsCount={Array.isArray(metric.acc.holdings) ? metric.acc.holdings.length : 0}
              holdings={Array.isArray(metric.acc.holdings) ? metric.acc.holdings : []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
