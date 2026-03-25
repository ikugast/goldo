import React, { useEffect, useState } from 'react';

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

interface RealtimeMetrics {
  netValueRatio: number;
  cumulativeReturn: number;
  totalMarketValue: number;
}

interface ModelCardProps {
  id: string;
  modelName: string;
  strategyName: string;
  netValue: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: Holding[];
  recentTrades: Trade[];
  aiReason: string;
  initialCash: number;
  onRealtimeUpdate?: (modelId: string, metrics: RealtimeMetrics) => void;
}

const SHANGHAI_TIMEZONE = 'Asia/Shanghai';

function getShanghaiTimeInfo() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  }
  const hour = parseInt(lookup.hour || '0', 10);
  const minute = parseInt(lookup.minute || '0', 10);
  const weekday = lookup.weekday || '';
  return { hour, minute, weekday };
}

function isShanghaiTradingTime(): boolean {
  try {
    const { weekday, hour, minute } = getShanghaiTimeInfo();
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }
    const totalMinutes = hour * 60 + minute;
    const morningStart = 9 * 60 + 30;
    const morningEnd = 11 * 60 + 30;
    const afternoonStart = 13 * 60;
    const afternoonEnd = 15 * 60;
    return (
      (totalMinutes >= morningStart && totalMinutes <= morningEnd) ||
      (totalMinutes >= afternoonStart && totalMinutes <= afternoonEnd)
    );
  } catch {
    // 如果时区解析失败，则不主动拉行情，避免影响主流程
    return false;
  }
}

const ModelCard: React.FC<ModelCardProps> = ({
  id,
  modelName,
  cumulativeReturn,
  availableCash,
  holdingsCount,
  holdings,
  recentTrades,
  initialCash,
  onRealtimeUpdate,
}) => {
  const [displayCumulativeReturn, setDisplayCumulativeReturn] = useState(cumulativeReturn);
  const [realQuotes, setRealQuotes] = useState<Record<string, RealQuote>>({});

  const isPositive = displayCumulativeReturn >= 0;

  // 计算市值（优先使用实时行情）
  const totalMarketValue = holdings.reduce((sum, h) => {
    const q = realQuotes[h.code];
    const price = q ? q.price : h.currentPrice;
    return sum + h.count * price;
  }, 0);

  useEffect(() => {
    setDisplayCumulativeReturn(cumulativeReturn);
  }, [cumulativeReturn]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (!holdings || holdings.length === 0) return;
      if (!isShanghaiTradingTime()) return;

      const codes = holdings.map((h) => h.code).join(',');
      try {
        const res = await fetch(`/api/market-quote?codes=${codes}`);
        if (!res.ok) {
          return;
        }
        const data: Record<string, RealQuote> = await res.json();
        setRealQuotes(data);

        const marketValue = holdings.reduce((sum, h) => {
          const q = data[h.code];
          const price = q ? q.price : h.currentPrice;
          return sum + h.count * price;
        }, 0);

        const totalNetAsset = availableCash + marketValue;
        const base = initialCash || 1;
        const netValueRatio = base > 0 ? totalNetAsset / base : 1;
        const nextCumulativeReturn = parseFloat(((netValueRatio - 1) * 100).toFixed(2));

        setDisplayCumulativeReturn(nextCumulativeReturn);

        if (onRealtimeUpdate) {
          onRealtimeUpdate(id, {
            netValueRatio,
            cumulativeReturn: nextCumulativeReturn,
            totalMarketValue: marketValue,
          });
        }
      } catch (error) {
        // 避免行情异常导致页面崩溃
        console.error('Failed to fetch real quotes', error);
      }
    };

    // 初始执行一次（若当前在交易时段）
    tick();

    // 每分钟检查一次，在交易时段刷新行情
    timer = setInterval(tick, 60 * 1000);

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [holdings, availableCash, initialCash, id, onRealtimeUpdate]);

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-8">
      {/* Model Name */}
      <h3 className="text-lg sm:text-[28px] font-bold text-gray-900 mb-8">{modelName}</h3>

      {/* Stats Grid - 4 Blocks */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">总收益率</p>
          <p
            className={`text-lg sm:text-[22px] font-bold ${
              isPositive ? 'text-[#FF4D4F]' : 'text-[#00B894]'
            }`}
          >
            {isPositive ? '+' : ''}
            {displayCumulativeReturn}%
          </p>
        </div>
        <div className="bg-[#F8F9FB] rounded-[18px] p-5">
          <p className="text-[13px] text-gray-400 mb-2">可用现金</p>
          <p className="text-lg sm:text-[22px] font-bold text-gray-900">
            ¥{(availableCash / 10000).toFixed(1)}w
          </p>
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
          <span className="text-[12px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {holdingsCount} 只
          </span>
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
                    <span className="text-[15px] sm:text-[17px] font-bold text-gray-900">
                      {h.name}
                    </span>
                    <span className="text-[13px] text-gray-400 font-mono">{h.code}</span>
                  </div>
                  {/* 盈亏（持仓成本 vs 现价）*/}
                  <div
                    className={`text-[15px] font-bold ${
                      profitRate >= 0 ? 'text-[#FF4D4F]' : 'text-[#00B894]'
                    }`}
                  >
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
                      <p
                        className={`font-bold ${
                          changePct >= 0 ? 'text-[#FF4D4F]' : 'text-[#00B894]'
                        }`}
                      >
                        {changePct >= 0 ? '+' : ''}
                        {changePct.toFixed(2)}%
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
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    t.direction === 'buy'
                      ? 'bg-red-50 text-red-500'
                      : 'bg-green-50 text-green-500'
                  }`}
                >
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
