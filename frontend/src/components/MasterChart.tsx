import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
interface MasterChartProps {
  data: any[];
}
const MasterChart: React.FC<MasterChartProps> = ({ data }) => {
  const startLabel = data.length > 0 ? data[0].name : '3/24';
  const endLabel = data.length > 0 ? data[data.length - 1].name : '--';
  const year = '2026';
  // 只显示最后一个日期刻度
  const xTicks = data.length > 0 ? [data[data.length - 1].name] : undefined;
  const formatYAxisTick = (value: number) => {
    // 按需求对特定刻度做“显示值重映射”
    if (Math.abs(value - 0.95) < 1e-6) return '0.5';
    if (Math.abs(value - 1.05) < 1e-6) return '1.25';
    if (Math.abs(value - 1.1) < 1e-6) return '1.5';
    // 其他刻度保持原样（去掉多余小数）
    const s = value.toString();
    return s;
  };
  return (
    <div className="quant-card p-6 h-[300px] sm:h-[400px] md:h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-serif-quant font-bold text-gray-800">净值曲线</h2>
        <div className="text-xs font-mono-quant text-gray-400 uppercase tracking-widest">
          {year}-{startLabel.replace('/', '-')} {'→'} {year}-{endLabel.replace('/', '-')}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#A0A4A8' }}
            reversed
            ticks={xTicks}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#A0A4A8' }}
            domain={[0.9, (dataMax: number) => Math.max(1.1, dataMax * 1.1)]}
            ticks={[0.95, 1, 1.05, 1.1]}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontFamily: 'Inter'
            }} 
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontFamily: 'Inter' }} />
          <Line 
            type="monotone" 
            dataKey="modelA" 
            name="seed 2.0" 
            stroke="#8A4FFF" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelB" 
            name="dpsk 3.2" 
            stroke="#FF4D4F" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelC" 
            name="seed 2.0" 
            stroke="#00B894" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelD" 
            name="dpsk 3.2" 
            stroke="#1890FF" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
export default MasterChart;
