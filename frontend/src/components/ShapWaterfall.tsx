import React from 'react';
import PlotlyPlot from 'react-plotly.js';
const Plot = (PlotlyPlot as any).default || PlotlyPlot;

interface ShapWaterfallProps {
  data: { [key: string]: number };
}

const ShapWaterfall: React.FC<ShapWaterfallProps> = ({ data }) => {
  const features = Object.keys(data);
  const values = Object.values(data);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100">
      <h4 className="text-sm font-bold mb-4 text-slate-700 uppercase tracking-tight">Feature Attribution (SHAP)</h4>
      <Plot
        data={[
          {
            type: 'bar',
            x: values,
            y: features,
            orientation: 'h',
            marker: {
              color: values.map(v => v > 0 ? '#ef4444' : '#22c55e'), // Red for positive impact (increasing bias/risk), Green for negative
            },
          },
        ]}
        layout={{
          width: 400,
          height: 300,
          margin: { l: 120, r: 20, t: 20, b: 40 },
          xaxis: { title: 'SHAP Value' },
          yaxis: { autorange: 'reversed' },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{ displayModeBar: false }}
      />
    </div>
  );
};

export default ShapWaterfall;
