import React, { useMemo, useState } from 'react';
import PlotlyPlot from 'react-plotly.js';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { MousePointerClick, ChevronDown, ChevronUp } from 'lucide-react';
import { decodeFeature, normalizeFeatureName } from '../utils/featureDecoder';

const Plot = (PlotlyPlot as any).default || PlotlyPlot;

interface ModelExplorerProps {
  dataPoints: any[];
  auditId?: string | null;
}

type FilterMode = 'all' | 'denied' | 'wronglyDenied';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const HIDDEN_KEYS = new Set(['confidence', 'jitter', 'predicted']);

function toDisplayLabel(key: string) {
  return key.replace(/[._]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNumericValue(point: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const entry = Object.entries(point).find(([pointKey]) => normalizeFeatureName(pointKey) === key);
    if (entry) {
      const value = Number(entry[1]);
      if (!Number.isNaN(value)) {
        return value;
      }
    }
  }
  return null;
}

function getFirstValue(point: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const entry = Object.entries(point).find(([pointKey]) => normalizeFeatureName(pointKey) === key);
    if (entry) {
      return entry;
    }
  }
  return null;
}

async function fetchCounterfactual(auditId: string, selectedPointIndex: number, targetOutcome: number) {
  const response = await fetch(`${API_BASE_URL}/counterfactual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audit_id: auditId,
      data_point_index: selectedPointIndex,
      target_outcome: targetOutcome,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to load counterfactuals');
  }

  return response.json();
}

const ModelExplorer: React.FC<ModelExplorerProps> = ({ dataPoints, auditId }) => {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const filteredPoints = useMemo(() => {
    if (filterMode === 'denied') {
      return dataPoints.filter((point) => point.predicted === 0);
    }

    if (filterMode === 'wronglyDenied') {
      return dataPoints.filter((point) => point.predicted === 0 && (point.actual === 1 || point.label === 1));
    }

    return dataPoints;
  }, [dataPoints, filterMode]);

  const handlePointClick = (event: any) => {
    const pointIdx = event.points[0].pointIndex;
    setSelectedPoint(filteredPoints[pointIdx]);
    setShowAllFeatures(false);
  };

  const xData = filteredPoints.map((point) => point.confidence || Math.random());
  const yData = filteredPoints.map((point) => point.jitter || Math.random());
  const colors = filteredPoints.map((point) => (point.predicted === 1 ? '#10b981' : '#ef4444'));
  const selectedPointIndex = selectedPoint?.id;
  const targetOutcome = selectedPoint?.predicted === 1 ? 0 : 1;

  const { data: counterfactualResponse, isLoading: isLoadingCounterfactuals } = useQuery({
    queryKey: ['counterfactual', auditId, selectedPointIndex, targetOutcome],
    queryFn: () => fetchCounterfactual(auditId as string, selectedPointIndex, targetOutcome),
    enabled: Boolean(auditId) && typeof selectedPointIndex === 'number',
  });

  const counterfactuals = counterfactualResponse?.counterfactuals || [];
  const identityGender = getFirstValue(selectedPoint || {}, ['gender', 'sex']);
  const identityOccupation = getFirstValue(selectedPoint || {}, ['occupation']);
  const ageValue = getNumericValue(selectedPoint || {}, ['age']);
  const hoursValue = getNumericValue(selectedPoint || {}, ['hours_per_week', 'hours']);
  const shapSum = Number(selectedPoint?.shap_sum || 0);
  const shapDirection = shapSum > 0 ? 'APPROVED' : 'DENIED';
  const shapStrength = Math.abs(shapSum) > 0.3 ? 'strongly' : Math.abs(shapSum) > 0.1 ? 'moderately' : 'slightly';

  const filterOptions: Array<{ key: FilterMode; label: string }> = [
    { key: 'all', label: 'All Points' },
    { key: 'denied', label: 'Show Denied Only' },
    { key: 'wronglyDenied', label: 'Show Wrongly Denied' },
  ];

  return (
    <div className="space-y-8 rounded border border-surface bg-paper p-8">
      <div className="mb-6 border-b border-surface pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-3xl font-display font-extrabold text-ink">Individual Case Explorer</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Click any point to see why that person was approved or denied, and what could change it.
            </p>
          </div>
          <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            <div className="flex items-center"><span className="mr-2 h-2.5 w-2.5 rounded bg-success-default"></span> Approved</div>
            <div className="flex items-center"><span className="mr-2 h-2.5 w-2.5 rounded bg-danger-default"></span> Denied</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
        <div className="rounded border border-surface bg-surface/50 p-6">
          <div className="mb-6 flex flex-wrap gap-3">
            {filterOptions.map((option) => {
              const active = filterMode === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFilterMode(option.key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    active ? 'bg-ink text-paper' : 'border border-surface bg-white text-ink-muted'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mb-6 text-xs font-medium leading-relaxed text-ink-muted">
            Visualizing sample data points by prediction confidence. Select a point to view its exact features and recourse options.
          </p>
          <div className="-ml-3">
            <Plot
              data={[
                {
                  x: xData,
                  y: yData,
                  mode: 'markers',
                  type: 'scatter',
                  marker: { color: colors, size: 8, opacity: 0.75, line: { width: 1, color: '#fff' } },
                  text: filteredPoints.map((point) => `ID: ${point.id || 'N/A'}`),
                  hoverinfo: 'text',
                },
              ]}
              layout={{
                width: 480,
                height: 400,
                margin: { t: 0, r: 0, b: 40, l: 40 },
                xaxis: { title: 'Model Confidence', range: [0, 1], tickfont: { family: 'Schibsted Grotesk', color: '#666' } },
                yaxis: { visible: false },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                clickmode: 'event+select',
                font: { family: 'Schibsted Grotesk', color: '#111' },
              }}
              config={{ displayModeBar: false }}
              onClick={handlePointClick}
            />
          </div>
        </div>

        <div className="h-full min-h-[400px]">
          <AnimatePresence mode="wait">
            {selectedPoint ? (
              <motion.div
                key={selectedPoint.index ?? selectedPoint.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="flex h-full flex-col gap-6 rounded border border-surface bg-paper p-8 shadow-sm"
              >
                <div className="space-y-5">
                  <div>
                    <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">Point Details</h4>
                    <div className="rounded-xl border border-surface bg-surface/30 p-5">
                      <p className="text-lg font-display font-bold text-ink">Person #{selectedPoint.id ?? 'N/A'}</p>
                      <p className="mt-2 text-sm font-medium text-ink-muted">
                        {identityGender ? decodeFeature(identityGender[0], identityGender[1]) : 'Unknown'}
                        {ageValue !== null ? ` · Age ${ageValue}` : ''}
                        {hoursValue !== null ? ` · Works ${hoursValue} hrs/week` : ''}
                      </p>
                      {identityOccupation ? (
                        <p className="mt-2 text-sm text-ink-muted">
                          Occupation: <span className="font-semibold text-ink">{decodeFeature(identityOccupation[0], identityOccupation[1])}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border border-surface bg-paper p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">All Features</p>
                      <button
                        type="button"
                        onClick={() => setShowAllFeatures((current) => !current)}
                        className="flex items-center gap-2 text-xs font-semibold text-ink-muted"
                      >
                        {showAllFeatures ? 'Hide all features' : 'Show all features'}
                        {showAllFeatures ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    {showAllFeatures ? (
                      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        {Object.entries(selectedPoint)
                          .filter(([key]) => !HIDDEN_KEYS.has(key))
                          .map(([key, value]) => (
                            <div key={key} className="flex flex-col border-b border-surface/50 pb-2">
                              <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">{toDisplayLabel(key)}</span>
                              <span className="font-semibold text-ink">{decodeFeature(key, value)}</span>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-surface bg-surface/30 p-5">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Decision Direction</p>
                    <p className="text-base font-semibold text-ink">
                      Factors {shapStrength} pushed toward {shapDirection}
                    </p>
                  </div>
                </div>

                <div className={`rounded border p-6 ${selectedPoint.predicted === 1 ? 'border-success-default/20 bg-success-surface' : 'border-danger-default/20 bg-danger-surface'}`}>
                  <div className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${selectedPoint.predicted === 1 ? 'text-success-default' : 'text-danger-default'}`}>
                    PREDICTED OUTCOME
                  </div>
                  <div className={`text-3xl font-display font-extrabold ${selectedPoint.predicted === 1 ? 'text-success-default' : 'text-danger-default'}`}>
                    {selectedPoint.predicted === 1 ? 'APPROVED' : 'DENIED'}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    What could change this outcome?
                  </p>
                  {isLoadingCounterfactuals ? (
                    <div className="mt-4 space-y-2">
                      {[0.9, 0.7, 0.8].map((width, index) => (
                        <div
                          key={index}
                          className="h-10 animate-pulse rounded-lg bg-slate-100"
                          style={{ width: `${width * 100}%`, animationDelay: `${index * 80}ms` }}
                        />
                      ))}
                    </div>
                  ) : counterfactuals.length ? (
                    counterfactuals.map((counterfactual: Record<string, { from: unknown; to: unknown }>, index: number) => (
                      <div key={index} className="mb-3 rounded-lg bg-slate-50 p-3">
                        <p className="mb-2 text-sm font-medium text-slate-700">Option {index + 1}</p>
                        {Object.entries(counterfactual).map(([feature, change]) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="text-green-500">↑</span>
                            <span>
                              {toDisplayLabel(feature)}: {decodeFeature(feature, change.from)} → {decodeFeature(feature, change.to)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No counterfactual recourse suggestions were returned for this case.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="flex h-full flex-col items-center justify-center rounded border border-dashed border-surface bg-surface/30 p-8 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <MousePointerClick className="h-8 w-8 text-slate-500" />
                </div>
                <p className="mb-1 font-medium text-slate-600">Select any point</p>
                <p className="text-sm text-slate-400">
                  Red points were denied. Green were approved.
                  <br />
                  Click any dot to see why and what could change it.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ModelExplorer;
