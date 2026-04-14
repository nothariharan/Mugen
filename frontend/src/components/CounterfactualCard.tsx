import React from 'react';

interface CounterfactualCardProps {
  originalPoint: any;
  counterfactuals: any[];
}

const CounterfactualCard: React.FC<CounterfactualCardProps> = ({ originalPoint, counterfactuals }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold mb-4 text-slate-800">Recourse & Counterfactuals</h3>
      <p className="text-xs text-slate-500 mb-4 italic">
        "What changes are needed to change the model outcome?"
      </p>

      <div className="space-y-4">
        {counterfactuals.map((cf, idx) => (
          <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
            <div className="text-xs font-bold text-blue-600 mb-2 uppercase">Scenario {idx + 1}</div>
            <div className="space-y-2">
              {Object.entries(cf).map(([feature, change]: [string, any]) => (
                <div key={feature} className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">{feature}:</span>
                  <span className="text-slate-800">
                    <span className="line-through text-slate-400 mr-2">{change.from}</span>
                    <span className="font-bold text-green-600">→ {change.to}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CounterfactualCard;
