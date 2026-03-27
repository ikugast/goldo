import React from 'react';
import ModelCard from './ModelCard';

interface ModelData {
  id: string;
  modelName: string;
  strategyName: string;
  netValue: number;
  cumulativeReturn: number;
  availableCash: number;
  holdingsCount: number;
  holdings: any[];
  recentTrades: any[];
  aiReason: string;
  initialCash: number;
}

interface RealtimeMetrics {
  netValueRatio: number;
  cumulativeReturn: number;
  totalMarketValue: number;
}

interface StrategyZoneProps {
  title: string;
  description: string;
  models: ModelData[];
  onRealtimeUpdate?: (modelId: string, metrics: RealtimeMetrics) => void;
}

const StrategyZone: React.FC<StrategyZoneProps> = ({ title, description, models, onRealtimeUpdate }) => {
  return (
    <div className="space-y-8">
      {/* Zone Header */}
      <div className="border-l-4 border-purple-500 pl-4 py-2">
        <h2 className="text-xl sm:text-2xl font-serif-quant font-bold text-gray-900 leading-tight">{title}</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>

      {/* Grid Layout: Desktop A/B side-by-side, Mobile single column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {models.map((model, idx) =>
          model ? (
            <ModelCard key={model.id ?? idx} {...model} />
          ) : null,
        )}
      </div>
    </div>
  );
};

export default StrategyZone;
