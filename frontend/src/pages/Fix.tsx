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
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in">
      <div className="w-12 h-12 border-2 border-brand-default border-t-transparent rounded-full animate-spin"></div>
      <div className="text-ink font-bold animate-pulse">Running Phase 2 Pipeline: {pathway === 'quick' ? 'Fairlearn' : 'AIF360'} Mitigation...</div>
      <div className="text-xs text-ink-muted uppercase tracking-widest">Applying thresholds & validating results</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <div className="border-b border-surface pb-6 animate-stagger-1">
        <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">Mitigation Studio</h2>
      </div>

      {!fixResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-stagger-2">
          <div
            onClick={() => handleFix('quick')}
            className="p-10 border border-surface rounded bg-paper cursor-pointer hover:border-brand-default hover:bg-brand-surface transition-all duration-300 ease-out-expo group hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-brand-default font-extrabold mb-4 text-2xl font-display group-hover:scale-[1.02] transition-transform origin-left">Quick Fix (Fairlearn)</div>
            <p className="text-ink-muted text-base leading-relaxed mb-8">
              Post-processing optimization. We don't touch your training data or model weights. We adjust the classification thresholds to satisfy <b>{auditResult.recommended_metric}</b>.
            </p>
            <ul className="text-sm text-ink-faint space-y-3 mb-10 font-medium tracking-wide">
              <li className="flex items-center"><span className="text-brand-default mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Ready in seconds</li>
              <li className="flex items-center"><span className="text-brand-default mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Works for black-box models</li>
              <li className="flex items-center"><span className="text-ink-faint mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Slight impact on accuracy</li>
            </ul>
            <button className="w-full py-4 bg-ink text-paper font-bold rounded group-hover:bg-brand-default transition-colors duration-300">Select Quick Fix</button>
          </div>

          <div
            onClick={() => handleFix('deep')}
            className="p-10 border border-surface rounded bg-paper cursor-pointer hover:border-success-default hover:bg-success-surface transition-all duration-300 ease-out-expo group hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-success-default font-extrabold mb-4 text-2xl font-display group-hover:scale-[1.02] transition-transform origin-left">Deep Fix (AIF360)</div>
            <p className="text-ink-muted text-base leading-relaxed mb-8">
              Pre-processing reweighing. We fix the underlying data distribution bias and retrain a new model (Random Forest). More robust for long-term compliance.
            </p>
            <ul className="text-sm text-ink-faint space-y-3 mb-10 font-medium tracking-wide">
              <li className="flex items-center"><span className="text-success-default mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Fixes bias at the source</li>
              <li className="flex items-center"><span className="text-success-default mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Higher quality predictions</li>
              <li className="flex items-center"><span className="text-ink-faint mr-2 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span> Requires access to training data</li>
            </ul>
            <button className="w-full py-4 bg-ink text-paper font-bold rounded group-hover:bg-success-default transition-colors duration-300">Select Deep Fix</button>
          </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-8 duration-700 ease-out-expo">
          <div className="bg-paper p-10 rounded border border-surface shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 py-2 px-6 bg-success-default text-paper font-bold text-[10px] uppercase tracking-[0.2em] rounded-bl">Mitigation Complete</div>
            <h3 className="text-4xl font-display font-extrabold text-ink mb-12">Mitigation Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="flex flex-col items-center p-8 bg-surface border border-surface/50 rounded">
                <BiasScoreGauge score={fixResult.before_score} title="Before Fix" />
                <div className="text-danger-default font-bold mt-6 tracking-wide text-sm">CRITICAL BIAS FOUND</div>
              </div>
              <div className="flex flex-col items-center p-8 border-2 border-brand-default rounded bg-brand-surface">
                <BiasScoreGauge score={fixResult.after_score} title="After Fix" />
                <div className="text-brand-default font-bold mt-6 flex items-center tracking-wide text-sm">
                  <span className="mr-2 text-lg leading-none">✓</span> COMPLIANCE THRESHOLD MET
                </div>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t border-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
               <div className="text-ink-muted text-sm max-w-sm leading-relaxed">
                 <div className="font-bold text-ink uppercase tracking-widest text-[10px] mb-2">Final Verdict</div>
                 Your model is now compliant with <b>EU AI Act Article 10</b> requirements regarding <b>{auditResult.recommended_metric}</b>.
               </div>
               <div className="flex gap-4">
                 <button
                   onClick={handleDownload}
                   className="px-8 py-4 bg-ink text-paper font-bold rounded hover:bg-brand-default transition-colors duration-300"
                 >
                   Download Compliance Report (.PDF)
                 </button>
                 <a
                   href={fixResult.fixed_model_url}
                   className="px-8 py-4 border border-surface text-ink font-bold rounded hover:bg-surface transition-colors duration-300"
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
