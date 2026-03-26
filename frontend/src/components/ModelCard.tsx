import React, { useEffect, useState, useRef } from 'react';

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

interface RealQuote {
  price: number;
  change_pct: number;
  name: string;
}

interface ModelCardProps {
  modelName: string;
  strategyName: string;
  netValue: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: Holding[];
  recentTrades: Trade[];
  aiReason: string;
}

const ModelCard: React.FC<ModelCardProps> = ({
  modelName,
  cumulativeReturn,
  availableCash,
  holdingsCount,
  holdings,
  recentTrades,
}) => {

  // 实时行情 state
  const [realQuotes, setRealQuotes] = useState<Record<string, RealQuote>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 计算最新市值
  const totalMarketValue = holdings.reduce((sum, h) => {
    const q = realQuotes[h.code];
    const price = q ? q.price : h.currentPrice;
    return sum + (h.count * price);
  }, 0);

  // 动态计算总收益率 (假设初始资金 100w，根据最新市值跳动)
  const isLive = Object.keys(realQuotes).length > 0;
  const displayReturn = isLive 
    ? (((availableCash + totalMarketValue) / 1000000) - 1) * 100 
    : cumulativeReturn;
  const isPositive = displayReturn >= 0;

  // 直接在前端通过东财接口拉取实时行情，不再依赖自建代理
  const fetchRealQuotes = async () => {
    if (!holdings || holdings.length === 0) return;
    
    // 构建东财所需的 secids
    const secids = holdings.map(h => {
      const code = h.code;
      if (code.endsWith('.SZ')) return `0.${code.split('.')[0]}`;
      if (code.endsWith('.SH')) return `1.${code.split('.')[0]}`;
      if (code.endsWith('.BJ')) return `0.${code.split('.')[0]}`;
      return `105.${code}`;
    }).join(',');

    try {
      const res = await fetch(`https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids}&fields=f12,f14,f2,f3`);
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data?.diff || [];
        
        const newQuotes: Record<string, RealQuote> = {};
        
        dataList.forEach((item: any) => {
          // 将行情数据匹配回我们自己的持仓标的
          const matchedHolding = holdings.find(h => h.code.startsWith(item.f12));
          if (matchedHolding) {
            newQuotes[matchedHolding.code] = {
              // f2 为价格(需除以100)，如果停牌是 '-' 则沿用老价格
              price: typeof item.f2 === 'number' ? item.f2 / 100 : matchedHolding.currentPrice,
              // f3 为涨跌幅(需除以100)
              change_pct: typeof item.f3 === 'number' ? item.f3 / 100 : 0,
              name: item.f14 || matchedHolding.name
            };
          }
        });
        
        setRealQuotes(newQuotes);
      }
    } catch (_) {
      // 忽略请求错误，避免刷屏
    }
  };

  useEffect(() => {
    fetchRealQuotes();
    // 之前写的是 3600000 (一小时)，现在改成 300000 (每 5 分钟刷新一次)
    intervalRef.current = setInterval(fetchRealQuotes, 300000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [holdings.map(h => h.code).join(',')]);

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-8">
      {/* Model Name */}
      <h3 className="text-lg sm:text-[28px] font-bold text-gray-900 mb-8">{modelName}</h3>

      {/* Stats Grid - 4 Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">总收益率</p>
          <p className={`text-lg sm:text-[22px] font-bold ${isPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
            {isPositive ? '+' : ''}{displayReturn.toFixed(2)}%
          </p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">可用现金</p>
          <p className="text-lg sm:text-[22px] font-bold text-gray-900">¥{(availableCash / 10000).toFixed(1)}w</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">当前持仓数量</p>
          <p className="text-lg sm:text-[22px] font-bold text-gray-900">{holdingsCount} 只</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">市值</p>
          <p className="text-lg sm:text-[22px] font-bold text-gray-900">
            ¥{(totalMarketValue / 10000).toFixed(1)}w
          </p>
        </div>
      </div>

      {/* Holdings Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-[18px] font-bold text-gray-900">当前持仓</h4>
          <span className="text-[12px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{holdingsCount} 只</span>
        </div>

        <div className="space-y-4">
          {holdings.map((h, i) => {
            const q = realQuotes[h.code];
            const livePrice = q ? q.price : h.currentPrice;
            const changePct = q ? q.change_pct : h.dailyChangePct;
            // 盈亏：以实时现价对比成本计算
            const profitRate = h.avgCost > 0
              ? parseFloat(((livePrice / h.avgCost - 1) * 100).toFixed(2))
              : 0;

            return (
              <div key={i} className="bg-[#F8F9FB] rounded-[20px] p-3 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-[15px] sm:text-[17px] font-bold text-gray-900">{h.name}</span>
                    <span className="text-[13px] text-gray-400 font-mono">{h.code}</span>
                  </div>
                  {/* 盈亏（持仓成本 vs 现价）*/}
                  <div className={`text-[15px] font-bold ${profitRate >= 0 ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
                    {profitRate >= 0 ? '↑' : '↓'} {Math.abs(profitRate)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-[13px]">
                  <div>
                    <p className="text-gray-400 mb-1">持股</p>
                    <p className="font-bold text-gray-900">{h.count}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">成本</p>
                    <p className="font-bold text-gray-900">¥{h.avgCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">现价</p>
                    <p className="font-bold text-gray-900">¥{livePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">今日涨跌</p>
                    {changePct !== null && changePct !== undefined ? (
                      <p className={`font-bold ${changePct >= 0 ? 'text-[#FF4D4F]' : 'text-[#00B894]'}`}>
                        {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                      </p>
                    ) : (
                      <p className="font-bold text-gray-400">--</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-[13px] text-gray-600 leading-relaxed">
                    <span className="font-bold text-gray-800">投资逻辑：</span>
                    {h.reason}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <h4 className="text-[18px] font-bold text-gray-900 mb-4">最近交易</h4>
        <div className="space-y-3">
          {recentTrades.map((t, i) => (
            <div key={i} className="flex justify-between items-center text-[13px]">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.direction === 'buy' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                  {t.direction === 'buy' ? '买入' : '卖出'}
                </span>
                <span className="font-bold text-gray-800">{t.name}</span>
              </div>
              <div className="text-gray-400 font-mono">
                {t.time} · ¥{t.price} · {t.amount}股
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
