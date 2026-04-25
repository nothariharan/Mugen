import React, { useEffect, useState } from 'react';

const STATUS_STEPS = [
  'Initializing Fairlearn Threshold Optimizer...',
  'Calculating demographic constraint limits...',
  'Shifting decision boundaries...',
  'Re-evaluating Equal Opportunity matrix...',
  'Packaging mitigated .pkl model...',
];

interface MitigationProcessingProps {
  pathway: 'quick' | 'deep';
  metric: string;
}

const MitigationProcessing: React.FC<MitigationProcessingProps> = ({ pathway, metric }) => {
  const [statusIdx, setStatusIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle status text every 1.5 s
  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => (prev + 1) % STATUS_STEPS.length);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Fake progress bar that fills up slowly and stalls near 95%
  useEffect(() => {
    let current = 0;
    const tick = setInterval(() => {
      current += Math.random() * 3.5;
      if (current >= 95) {
        current = 95;
        clearInterval(tick);
      }
      setProgress(current);
    }, 400);
    return () => clearInterval(tick);
  }, []);

  const pathwayLabel =
    pathway === 'quick'
      ? 'Quick Fix · Fairlearn ThresholdOptimizer'
      : 'Deep Fix · AIF360 Reweighing + RandomForest';

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center space-y-10 animate-in fade-in duration-500">
      {/* Pulsing glow ring + spinner */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow ring */}
        <span className="absolute h-28 w-28 animate-ping rounded-full bg-brand-default/10" />
        <span className="absolute h-20 w-20 animate-pulse rounded-full bg-brand-default/15" />

        {/* Spinner */}
        <div className="relative h-16 w-16 rounded-full border-[3px] border-surface">
          <div className="absolute inset-0 rounded-full border-[3px] border-t-brand-default border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>

        {/* Inner dot */}
        <span className="absolute h-3 w-3 rounded-full bg-brand-default animate-pulse" />
      </div>

      {/* Engine label */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
          {pathwayLabel}
        </p>
        <p className="text-[10px] font-mono text-ink-faint">
          fairness_metric: <span className="text-brand-default">{metric}</span>
        </p>
      </div>

      {/* Cycling status text */}
      <div className="relative h-6 overflow-hidden w-full max-w-sm text-center">
        <p
          key={statusIdx}
          className="absolute inset-0 flex items-center justify-center text-sm font-medium text-ink animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {STATUS_STEPS[statusIdx]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-ink-faint">
          <span>processing</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-brand-default transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step checklist */}
      <div className="w-full max-w-xs space-y-2.5">
        {STATUS_STEPS.map((step, i) => {
          const done = i < statusIdx;
          const active = i === statusIdx;
          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`
                  h-5 w-5 flex-shrink-0 rounded-full flex items-center justify-center
                  text-[10px] font-bold transition-all duration-500
                  ${done
                    ? 'bg-success-default text-paper'
                    : active
                    ? 'border-2 border-brand-default bg-brand-surface animate-pulse'
                    : 'border border-surface bg-paper text-ink-faint'
                  }
                `}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  done || active ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink-faint">This may take 10–30 seconds on large datasets</p>
    </div>
  );
};

export default MitigationProcessing;
