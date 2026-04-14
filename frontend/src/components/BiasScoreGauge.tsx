import React from 'react';
import Plot from 'react-plotly.js';

interface BiasScoreGaugeProps {
  score: number;
  title?: string;
}

const BiasScoreGauge: React.FC<BiasScoreGaugeProps> = ({ score, title = "Bias Score" }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <Plot
        data={[
          {
            type: "indicator",
            mode: "gauge+number",
            value: score,
            title: { text: title, font: { size: 18 } },
            gauge: {
              axis: { range: [0, 100], tickwidth: 1, tickcolor: "darkblue" },
              bar: { color: "#3b82f6" }, // blue-500
              bgcolor: "white",
              borderwidth: 2,
              bordercolor: "gray",
              steps: [
                { range: [0, 30], color: "#22c55e" }, // green-500
                { range: [30, 60], color: "#f59e0b" }, // amber-500
                { range: [60, 100], color: "#ef4444" }, // red-500
              ],
            },
          },
        ]}
        layout={{
          width: 300,
          height: 250,
          margin: { t: 25, r: 25, l: 25, b: 25 },
          paper_bgcolor: "white",
          font: { color: "black", family: "Inter" }
        }}
        config={{ displayModeBar: false }}
      />
      <div className="text-center text-xs text-slate-500 -mt-4">
        Lower is better (0 = Perfect, 100 = Maximally Biased)
      </div>
    </div>
  );
};

export default BiasScoreGauge;
