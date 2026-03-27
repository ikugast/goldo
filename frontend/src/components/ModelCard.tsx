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
const ModelCard: React.FC<ModelCardProps> = ({
  modelName,
  cumulativeReturn,
  availableCash,
  holdingsCount,
  holdings,
}) => {
  // 基于后端同步的价格计算总市值
  const totalMarketValue = holdings.reduce((sum, h) => sum + (h.count * h.currentPrice), 0);
  const isPositive = cumulativeReturn >= 0;
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
          disabled={isRefreshing} 
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-50 rounded-full text-gray-500 text-sm"
        >
          <svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>刷新数据</span>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">总收益率</p>
          <p className={`text-[22px] font-bold ${isPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
            {isPositive ? '+' : ''}{cumulativeReturn.toFixed(2)}%
          </p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">市值</p>
          <p className="text-[22px] font-bold text-gray-900">¥{(totalMarketValue / 10000).toFixed(1)}w</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">可用现金</p>
          <p className="text-[22px] font-bold text-gray-900">¥{(availableCash / 10000).toFixed(1)}w</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">当前持仓</p>
          <p className="text-[22px] font-bold text-gray-900">{holdingsCount} 只</p>
        </div>
      </div>
      <div className="space-y-4">
        {holdings.map((h, i) => {
          const isHoldPositive = h.profitRate >= 0;
          const isDailyPositive = (h.dailyChangePct || 0) >= 0;
          return (
            <div key={i} className="bg-[#F8F9FB] rounded-[20px] p-5">
              <div className="flex justify-between mb-4">
                <div>
                  <span className="font-bold text-gray-900">{h.name}</span> 
                  <span className="text-gray-400 font-mono text-xs ml-2">{h.code}</span>
                </div>
                <div className={`font-bold ${isHoldPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
                  {isHoldPositive ? '↑' : '↓'} {Math.abs(h.profitRate).toFixed(2)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">持股: <b>{h.count}</b></div>
                <div className="text-gray-500">现价: <b>¥{h.currentPrice.toFixed(2)}</b></div>
                <div className="text-gray-500">成本: <b>¥{h.avgCost.toFixed(2)}</b></div>
                <div className="text-gray-500">今日: <b className={isDailyPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}>{isDailyPositive ? '+' : ''}{(h.dailyChangePct || 0).toFixed(2)}%</b></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ModelCard;
