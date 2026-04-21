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
    <div className="bg-paper p-8 rounded border border-surface">
      <h4 className="text-[10px] font-bold mb-6 text-ink-faint uppercase tracking-[0.2em]">Feature Attribution (SHAP)</h4>
      <div className="-ml-4">
        <Plot
          data={[
            {
              type: 'bar',
              x: values,
              y: features,
              orientation: 'h',
              marker: {
                color: values.map(v => v > 0 ? '#ef4444' : '#10b981'), // Danger/Success precise hex matching the OKLCH theme for plotting
              },
            },
          ]}
          layout={{
            width: 400,
            height: 300,
            margin: { l: 120, r: 20, t: 10, b: 40 },
            xaxis: { title: 'SHAP Value', tickfont: { family: 'Schibsted Grotesk', color: '#666' } },
            yaxis: { autorange: 'reversed', tickfont: { family: 'Schibsted Grotesk', color: '#222', size: 12 } },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { family: 'Schibsted Grotesk', color: '#111' }
          }}
          config={{ displayModeBar: false }}
        />
      </div>
    </div>
  );
};

export default ShapWaterfall;
