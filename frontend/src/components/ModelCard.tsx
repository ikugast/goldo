import React, { useState } from 'react';
interface Holding {
  name: string;
  code: string;
  count: number;
  avgCost: number;
  currentPrice: number;
  profitRate: number;
  dailyChangePct: number | null;
  reason: string;
  amount?: number;
  current_price?: number;
  cost_price?: number;
  profit_rate?: number;
}
interface Trade {
  name: string;
  time: string;
  direction: 'buy' | 'sell';
  price: number;
  amount: number;
}
interface ModelCardProps {
  modelName: string;
  strategyName: string;
  netValue: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: Holding[];
  recentTrades?: Trade[];
  aiReason?: string;
}
const safeNum = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const ModelCard: React.FC<ModelCardProps> = ({
  modelName,
  cumulativeReturn,
  availableCash,
  holdingsCount,
  holdings,
}) => {
  const safeHoldings = Array.isArray(holdings) ? holdings : [];
  const safeCumulativeReturn = safeNum(cumulativeReturn);
  const safeAvailableCash = safeNum(availableCash);
  
  // 基于后端同步的价格计算总市值（兼容了 amount/count 和 currentPrice/current_price）
  const totalMarketValue = safeHoldings.reduce((sum, h) => {
    const qty = safeNum(h?.count || h?.amount);
    const price = safeNum(h?.currentPrice || h?.current_price);
    return sum + (qty * price);
  }, 0);
  
  const isPositive = safeCumulativeReturn >= 0;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    // 强制刷新页面以获取最新的 simulation_output.json
    window.location.reload(); 
  };
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-[28px] font-bold text-gray-900">{modelName}</h3>
        <button
          onClick={handleManualRefresh}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-50 text-gray-500 text-xs rounded-full hover:bg-gray-100 transition-colors"
        >
          <span className={`${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
          <span>{isRefreshing ? '刷新中' : '同步数据'}</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">总收益率</p>
          <p className={`text-[22px] font-bold ${isPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
            {isPositive ? '+' : ''}{safeCumulativeReturn.toFixed(2)}%
          </p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">市值</p>
          <p className="text-[22px] font-bold text-gray-900">¥{(totalMarketValue / 10000).toFixed(1)}w</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">可用现金</p>
          <p className="text-[22px] font-bold text-gray-900">¥{(safeAvailableCash / 10000).toFixed(1)}w</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">当前持仓</p>
          <p className="text-[22px] font-bold text-gray-900">{holdingsCount || 0} 只</p>
        </div>
      </div>
      <div className="space-y-4">
        {safeHoldings.map((h, i) => {
          // 兼容两种不同的 JSON 字段名
          const sProfitRate = safeNum(h?.profitRate !== undefined ? h.profitRate : h?.profit_rate);
          const sCurrentPrice = safeNum(h?.currentPrice !== undefined ? h.currentPrice : h?.current_price);
          const sAvgCost = safeNum(h?.avgCost !== undefined ? h.avgCost : h?.cost_price);
          const sDailyChangePct = safeNum(h?.dailyChangePct);
          const qty = safeNum(h?.count !== undefined ? h.count : h?.amount);
          
          const isHoldPositive = sProfitRate >= 0;
          const isDailyPositive = sDailyChangePct >= 0;
          
          return (
            <div key={i} className="bg-[#F8F9FB] rounded-[16px] p-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="font-bold text-gray-900">{h?.name || '--'}</span> 
                  <span className="text-gray-400 font-mono text-xs ml-2">{h?.code || '--'}</span>
                </div>
                <div className={`font-bold ${isHoldPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
                  {isHoldPositive ? '↑' : '↓'} {Math.abs(sProfitRate).toFixed(2)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">持股: <b>{qty}</b></div>
                <div className="text-gray-500">现价: <b>¥{sCurrentPrice.toFixed(2)}</b></div>
                <div className="text-gray-500">成本: <b>¥{sAvgCost.toFixed(2)}</b></div>
                <div className="text-gray-500">今日: <b className={isDailyPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}>{isDailyPositive ? '+' : ''}{sDailyChangePct.toFixed(2)}%</b></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ModelCard;
