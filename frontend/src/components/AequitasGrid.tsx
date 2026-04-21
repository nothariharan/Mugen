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
      return value < 0.8 ? 'bg-danger-surface text-danger-default border border-danger-default/20' : 'bg-success-surface text-success-default border border-success-default/20';
    }
    return value > 0.1 ? 'bg-danger-surface text-danger-default border border-danger-default/20' : 'bg-success-surface text-success-default border border-success-default/20';
  };

  return (
    <div className="bg-paper p-8 rounded border border-surface">
      <h3 className="text-xl font-display font-bold mb-6 text-ink">Bias Report Card</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded ${getStatus('disparate_impact', metrics.disparate_impact)}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Disparate Impact</div>
          <div className="text-4xl font-display font-extrabold mb-1">{metrics.disparate_impact}</div>
          <div className="text-xs font-medium opacity-80 decoration-dotted underline">Target: {">"} 0.80</div>
        </div>
        <div className={`p-6 rounded ${getStatus('equal_opportunity_diff', metrics.equal_opportunity_diff)}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">Equal Opp. Diff</div>
          <div className="text-4xl font-display font-extrabold mb-1">{metrics.equal_opportunity_diff}</div>
          <div className="text-xs font-medium opacity-80 decoration-dotted underline">Target: {"<"} 0.05</div>
        </div>
        <div className={`p-6 rounded ${getStatus('fnr_gap', metrics.fnr_gap)}`}>
          <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">False Neg Rate Gap</div>
          <div className="text-4xl font-display font-extrabold mb-1">{metrics.fnr_gap}</div>
          <div className="text-xs font-medium opacity-80 decoration-dotted underline">Target: {"<"} 0.10</div>
        </div>
      </div>
    </div>
  );
};

export default AequitasGrid;
