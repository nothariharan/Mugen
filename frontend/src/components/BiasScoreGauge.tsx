import React from 'react';
import PlotlyPlot from 'react-plotly.js';
const Plot = (PlotlyPlot as any).default || PlotlyPlot;

interface BiasScoreGaugeProps {
  score: number;
  title?: string;
}

const BiasScoreGauge: React.FC<BiasScoreGaugeProps> = ({ score, title = "Bias Score" }) => {
  return (
    <div className="bg-paper p-6 rounded border border-surface">
      <Plot
        data={[
          {
            type: "indicator",
            mode: "gauge+number",
            value: score,
            title: { text: title, font: { size: 18, family: "Bricolage Grotesque", color: "#111" } },
            number: { font: { family: "Bricolage Grotesque" } },
            gauge: {
              axis: { range: [0, 100], tickwidth: 1, tickcolor: "#555" },
              bar: { color: "#222" }, // deep ink equivalent
              bgcolor: "#f9f9f9",
              borderwidth: 0,
              bordercolor: "transparent",
              steps: [
                { range: [0, 30], color: "#10b981" }, // success equivalent
                { range: [30, 60], color: "#f59e0b" }, // warning equivalent
                { range: [60, 100], color: "#ef4444" }, // danger equivalent
              ],
            },
          },
        ]}
        layout={{
          width: 300,
          height: 250,
          margin: { t: 25, r: 25, l: 25, b: 25 },
          paper_bgcolor: "transparent",
          font: { color: "#111", family: "Schibsted Grotesk" }
        }}
        config={{ displayModeBar: false }}
      />
      <div className="text-center text-xs text-ink-faint font-medium uppercase tracking-widest -mt-2">
        Lower is better
      </div>
    </div>
  );
};

export default BiasScoreGauge;
