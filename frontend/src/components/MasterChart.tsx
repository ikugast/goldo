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
  const startLabel = data.length > 0 ? data[0].name : '3/25';
  const endLabel = data.length > 0 ? data[data.length - 1].name : '3/25';
  const year = '2026';

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
            padding={{ left: 0, right: 0 }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#A0A4A8' }}
            domain={[0.9, (dataMax: number) => Math.max(1.1, dataMax * 1.1)]}
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
            name="seed 2.0（技术流）" 
            stroke="#8A4FFF" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelB" 
            name="dpsk 3.2（技术流）" 
            stroke="#FF4D4F" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelC" 
            name="seed 2.0（龙头战法）" 
            stroke="#00B894" 
            strokeWidth={3} 
            dot={false} 
            activeDot={{ r: 4 }} 
          />
          <Line 
            type="monotone" 
            dataKey="modelD" 
            name="dpsk 3.2（龙头战法）" 
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
