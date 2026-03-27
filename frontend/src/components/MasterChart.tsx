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

interface ChartDataPoint {
  date: string;
  [key: string]: number | string;
}

interface MasterChartProps {
  data: ChartDataPoint[];
  lines: Array<{ key: string; name: string; color: string }>;
}

const MasterChart: React.FC<MasterChartProps> = ({ data, lines }) => {
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#A0AEC0', fontSize: 12 }}
            dy={10}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#A0AEC0', fontSize: 12 }}
            domain={['auto', 'auto']}
            dx={-10}
          />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
            labelStyle={{ color: '#A0AEC0', marginBottom: '4px' }}
          />
          <Legend iconType="circle" iconSize={8} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MasterChart;
