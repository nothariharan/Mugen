import React from 'react';

interface AequitasGridProps {
  metrics: {
    disparate_impact: number;
    equal_opportunity_diff: number;
    fnr_gap: number;
  };
}

const AequitasGrid: React.FC<AequitasGridProps> = ({ metrics }) => {
  const getStatus = (metric: string, value: number) => {
    if (metric === 'disparate_impact') {
      return value < 0.8 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    }
    return value > 0.1 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold mb-4 text-slate-800">Bias Report Card</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${getStatus('disparate_impact', metrics.disparate_impact)}`}>
          <div className="text-xs font-semibold uppercase opacity-75">Disparate Impact</div>
          <div className="text-2xl font-bold">{metrics.disparate_impact}</div>
          <div className="text-[10px] mt-1 italic">Target: {">"} 0.80</div>
        </div>
        <div className={`p-4 rounded-lg ${getStatus('equal_opportunity_diff', metrics.equal_opportunity_diff)}`}>
          <div className="text-xs font-semibold uppercase opacity-75">Equal Opp. Diff</div>
          <div className="text-2xl font-bold">{metrics.equal_opportunity_diff}</div>
          <div className="text-[10px] mt-1 italic">Target: {"<"} 0.05</div>
        </div>
        <div className={`p-4 rounded-lg ${getStatus('fnr_gap', metrics.fnr_gap)}`}>
          <div className="text-xs font-semibold uppercase opacity-75">False Neg Rate Gap</div>
          <div className="text-2xl font-bold">{metrics.fnr_gap}</div>
          <div className="text-[10px] mt-1 italic">Target: {"<"} 0.10</div>
        </div>
      </div>
    </div>
  );
};

export default AequitasGrid;
