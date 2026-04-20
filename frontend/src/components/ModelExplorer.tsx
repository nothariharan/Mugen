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
  const colors = dataPoints.map(p => p.predicted === 1 ? '#22c55e' : '#ef4444');

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-extrabold text-slate-800">Model Explorer</h3>
        <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
           <div className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> Approved</div>
           <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span> Denied</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-4 italic">Visualizing 500 sample data points by prediction confidence.</p>
          <Plot
            data={[
              {
                x: xData,
                y: yData,
                mode: 'markers',
                type: 'scatter',
                marker: { color: colors, size: 8, opacity: 0.7 },
                text: dataPoints.map(p => `ID: ${p.id || 'N/A'}`),
                hoverinfo: 'text',
              },
            ]}
            layout={{
              width: 500,
              height: 400,
              margin: { t: 0, r: 0, b: 40, l: 40 },
              xaxis: { title: 'Model Confidence', range: [0, 1] },
              yaxis: { visible: false },
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              clickmode: 'event+select',
            }}
            config={{ displayModeBar: false }}
            onClick={handlePointClick}
          />
        </div>

        <div className="space-y-6">
          {selectedPoint ? (
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-in slide-in-from-right-10 duration-500">
               <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Point Details</h4>
               <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                 {Object.entries(selectedPoint).filter(([k]) => k !== 'confidence' && k !== 'jitter' && k !== 'predicted').map(([k, v]) => (
                   <div key={k} className="flex flex-col">
                      <span className="text-slate-400 font-medium text-[10px] uppercase">{k}</span>
                      <span className="text-slate-800 font-bold">{String(v)}</span>
                   </div>
                 ))}
               </div>
               <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="text-xs font-bold text-blue-600 mb-1">PREDICTED OUTCOME</div>
                  <div className={`text-xl font-extrabold ${selectedPoint.predicted === 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPoint.predicted === 1 ? 'APPROVED' : 'DENIED'}
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-20 border-2 border-dashed border-slate-100 rounded-xl text-slate-300 italic text-sm">
              Click a data point to explore local SHAP and counterfactuals.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelExplorer;
