import React, { useState } from 'react';
import PlotlyPlot from 'react-plotly.js';
const Plot = (PlotlyPlot as any).default || PlotlyPlot;

interface ModelExplorerProps {
  dataPoints: any[];
}

const ModelExplorer: React.FC<ModelExplorerProps> = ({ dataPoints }) => {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  const handlePointClick = (event: any) => {
    const pointIdx = event.points[0].pointIndex;
    setSelectedPoint(dataPoints[pointIdx]);
  };

  const xData = dataPoints.map(p => p.confidence || Math.random());
  const yData = dataPoints.map(p => p.jitter || Math.random());
  const colors = dataPoints.map(p => p.predicted === 1 ? '#10b981' : '#ef4444');

  return (
    <div className="bg-paper p-8 rounded border border-surface space-y-8">
      <div className="flex justify-between items-center mb-6 border-b border-surface pb-6">
        <h3 className="text-3xl font-display font-extrabold text-ink">Model Explorer</h3>
        <div className="flex gap-6 text-[10px] font-bold text-ink-faint uppercase tracking-widest">
           <div className="flex items-center"><span className="w-2.5 h-2.5 bg-success-default rounded mr-2"></span> Approved</div>
           <div className="flex items-center"><span className="w-2.5 h-2.5 bg-danger-default rounded mr-2"></span> Denied</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="bg-surface/50 border border-surface rounded p-6">
          <p className="text-xs text-ink-muted mb-6 font-medium leading-relaxed">Visualizing 500 sample data points by prediction confidence. Select a point to view its exact features.</p>
          <div className="-ml-3">
            <Plot
              data={[
                {
                  x: xData,
                  y: yData,
                  mode: 'markers',
                  type: 'scatter',
                  marker: { color: colors, size: 8, opacity: 0.75, line: { width: 1, color: '#fff'} },
                  text: dataPoints.map(p => `ID: ${p.id || 'N/A'}`),
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
                font: { family: 'Schibsted Grotesk', color: '#111' }
              }}
              config={{ displayModeBar: false }}
              onClick={handlePointClick}
            />
          </div>
        </div>

        <div className="h-full min-h-[400px]">
          {selectedPoint ? (
            <div className="bg-paper p-8 rounded border border-surface shadow-sm animate-in slide-in-from-right-8 duration-500 ease-out-expo h-full flex flex-col justify-between">
               <div>
                 <h4 className="text-[10px] font-bold text-ink-faint uppercase tracking-[0.2em] mb-6">Point Details</h4>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mb-8">
                   {Object.entries(selectedPoint).filter(([k]) => k !== 'confidence' && k !== 'jitter' && k !== 'predicted').map(([k, v]) => (
                     <div key={k} className="flex flex-col border-b border-surface/50 pb-2">
                        <span className="text-ink-muted font-bold text-[10px] uppercase tracking-widest mb-1">{k}</span>
                        <span className="text-ink font-semibold">{String(v)}</span>
                     </div>
                   ))}
                 </div>
               </div>
               <div className={`p-6 border rounded ${selectedPoint.predicted === 1 ? 'bg-success-surface border-success-default/20' : 'bg-danger-surface border-danger-default/20'}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${selectedPoint.predicted === 1 ? 'text-success-default' : 'text-danger-default'}`}>PREDICTED OUTCOME</div>
                  <div className={`text-3xl font-display font-extrabold ${selectedPoint.predicted === 1 ? 'text-success-default' : 'text-danger-default'}`}>
                    {selectedPoint.predicted === 1 ? 'APPROVED' : 'DENIED'}
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-20 border border-dashed border-surface rounded bg-surface/30 text-ink-muted font-medium text-sm text-center">
              Click a data point on the left to explore its local features and outcome.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelExplorer;
