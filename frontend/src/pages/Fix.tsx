import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';

const FixPage: React.FC = () => {
  const navigate = useNavigate();
  const { auditId, auditResult, setFixId, fixResult, setFixResult } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [pathway, setPathway] = useState<'quick' | 'deep' | null>(null);

  if (!auditId || !auditResult) {
    navigate('/');
    return null;
  }

  const handleFix = async (selectedPathway: 'quick' | 'deep') => {
    setPathway(selectedPathway);
    setLoading(true);
    try {
      // Mock duration for POC progress visualization
      await new Promise(r => setTimeout(r, 2000));
      const res = await apiClient.startFix(auditId, selectedPathway, auditResult.recommended_metric);
      setFixId(res.fix_id);
      setFixResult(res);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDownload = async () => {
     try {
       const blob = await apiClient.getReport(auditId, fixResult.fix_id);
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `compliance_report_${auditId}.pdf`;
       document.body.appendChild(a);
       a.click();
       a.remove();
     } catch (err) {
       console.error(err);
     }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-slate-600 font-medium animate-pulse">Running Phase 2 Pipeline: {pathway === 'quick' ? 'Fairlearn' : 'AIF360'} Mitigation...</div>
      <div className="text-xs text-slate-400">Applying thresholds & validating results...</div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <h2 className="text-3xl font-extrabold text-slate-900 leading-tight">Mitigation Dashboard</h2>

      {!fixResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div
            onClick={() => handleFix('quick')}
            className="p-8 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group shadow-sm bg-white"
          >
            <div className="text-blue-600 font-bold mb-2 text-xl group-hover:scale-105 transition-transform origin-left">Quick Fix (Fairlearn)</div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Post-processing optimization. We don't touch your training data or model weights. We adjust the classification thresholds to satisfy <b>{auditResult.recommended_metric}</b>.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 mb-6">
              <li>✓ Ready in seconds</li>
              <li>✓ Works for black-box models</li>
              <li>✗ Slight impact on accuracy</li>
            </ul>
            <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg group-hover:bg-blue-600 transition-all">Select Quick Fix</button>
          </div>

          <div
            onClick={() => handleFix('deep')}
            className="p-8 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all group shadow-sm bg-white"
          >
            <div className="text-green-600 font-bold mb-2 text-xl group-hover:scale-105 transition-transform origin-left">Deep Fix (AIF360)</div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              Pre-processing reweighing. We fix the underlying data distribution bias and retrain a new model (Random Forest). More robust for long-term compliance.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 mb-6">
              <li>✓ Fixes bias at the source</li>
              <li>✓ Higher quality predictions</li>
              <li>✗ Requires access to training data</li>
            </ul>
            <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg group-hover:bg-green-600 transition-all">Select Deep Fix</button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border-2 border-green-200 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 bg-green-500 text-white font-bold text-xs uppercase tracking-widest rounded-bl-xl">Success</div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-8">Mitigation Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="flex flex-col items-center">
                <BiasScoreGauge score={fixResult.before_score} title="Before Fix" />
                <div className="text-red-500 font-bold mt-4">CRITICAL BIAS FOUND</div>
              </div>
              <div className="flex flex-col items-center">
                <BiasScoreGauge score={fixResult.after_score} title="After Fix" />
                <div className="text-green-600 font-bold mt-4 flex items-center">
                  <span className="mr-2">✓</span> COMPLIANCE THRESHOLD MET
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="text-slate-600 text-sm">
                 <div className="font-bold text-slate-800">Final Verdict:</div>
                 Your model is now compliant with <b>EU AI Act Article 10</b> thresholds for {auditResult.recommended_metric}.
               </div>
               <div className="flex gap-4">
                 <button
                   onClick={handleDownload}
                   className="px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition-all shadow-md active:scale-95 flex items-center"
                 >
                   Download Compliance Report (.PDF)
                 </button>
                 <a
                   href={fixResult.fixed_model_url}
                   className="px-8 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-all active:scale-95"
                 >
                   Download Fixed Model (.PKL)
                 </a>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixPage;
