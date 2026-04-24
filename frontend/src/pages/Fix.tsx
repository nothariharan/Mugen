import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';

// Step labels shown during loading
const QUICK_STEPS = ['Fitting ThresholdOptimizer…', 'Validating fairness metrics…', 'Finalising fixed model…'];
const DEEP_STEPS  = ['Running AIF360 Reweighing…', 'Retraining RandomForest…', 'Validating fairness metrics…'];

const MetricRow: React.FC<{ label: string; value: number; thresholdOk: boolean }> = ({ label, value, thresholdOk }) => (
  <div className="flex items-center justify-between py-3 border-b border-surface last:border-0">
    <span className="text-sm font-medium text-ink-muted">{label}</span>
    <div className="flex items-center gap-3">
      <span className="font-mono font-bold text-ink text-sm">{value.toFixed(3)}</span>
      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
        thresholdOk ? 'bg-success-surface text-success-default' : 'bg-danger-surface text-danger-default'
      }`}>
        {thresholdOk ? 'PASS' : 'FAIL'}
      </span>
    </div>
  </div>
);

const FixPage: React.FC = () => {
  const navigate = useNavigate();
  const { auditId, auditResult, setFixId, fixResult, setFixResult } = useAuditStore();
  const [loading, setLoading]     = useState(false);
  const [pathway, setPathway]     = useState<'quick' | 'deep' | null>(null);
  const [stepIdx, setStepIdx]     = useState(0);

  if (!auditId || !auditResult) {
    navigate('/');
    return null;
  }

  const handleFix = async (selectedPathway: 'quick' | 'deep') => {
    setPathway(selectedPathway);
    setLoading(true);
    setStepIdx(0);

    const steps = selectedPathway === 'quick' ? QUICK_STEPS : DEEP_STEPS;
    // Advance fake step labels every ~1.5 s while backend works
    const interval = setInterval(() => {
      setStepIdx(prev => Math.min(prev + 1, steps.length - 1));
    }, 1500);

    try {
      const res = await apiClient.startFix(auditId, selectedPathway, auditResult.recommended_metric);
      clearInterval(interval);
      setFixId(res.fix_id);
      setFixResult(res);
    } catch (err) {
      clearInterval(interval);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await apiClient.getReport(auditId, fixResult.fix_id);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `compliance_report_${auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && pathway) {
    const steps = pathway === 'quick' ? QUICK_STEPS : DEEP_STEPS;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
          {pathway === 'quick' ? 'Quick Fix · Fairlearn' : 'Deep Fix · AIF360 Reweighing'}
        </div>
        <div className="w-full max-w-sm space-y-3">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-500 ${
                i < stepIdx  ? 'bg-success-default text-paper' :
                i === stepIdx ? 'border-2 border-brand-default bg-brand-surface animate-pulse' :
                                'border border-surface bg-paper text-ink-faint'
              }`}>
                {i < stepIdx ? '✓' : i + 1}
              </div>
              <span className={`text-sm font-medium transition-colors duration-300 ${
                i <= stepIdx ? 'text-ink' : 'text-ink-faint'
              }`}>{step}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-ink-faint">This may take 10–30 seconds on large datasets</div>
      </div>
    );
  }

  // ── Results state ──────────────────────────────────────────────────────────
  if (fixResult) {
    const improved   = fixResult.after_score < fixResult.before_score;
    const delta      = Math.round(fixResult.before_score - fixResult.after_score);
    const pm         = fixResult.post_fix_metrics ?? {};
    const diOk       = (pm.disparate_impact   ?? 0) >= 0.80;
    const eoOk       = Math.abs(pm.equal_opportunity_diff ?? 1) <= 0.05;
    const fnrOk      = Math.abs(pm.fnr_gap ?? 1)               <= 0.10;
    const pathwayLabel = fixResult.pathway === 'quick'
      ? 'Quick Fix · Fairlearn ThresholdOptimizer'
      : 'Deep Fix · AIF360 Reweighing + RandomForest';

    return (
      <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in slide-in-from-bottom-8 duration-700">
        <div className="border-b border-surface pb-6">
          <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">Mitigation Studio</h2>
          <p className="text-ink-muted text-sm mt-2">{pathwayLabel}</p>
        </div>

        <div className="bg-paper p-10 rounded border border-surface shadow-sm relative overflow-hidden">
          <div className={`absolute top-0 right-0 py-2 px-6 font-bold text-[10px] uppercase tracking-[0.2em] rounded-bl
            ${improved ? 'bg-success-default text-paper' : 'bg-warning-default text-paper'}`}>
            {improved ? 'Mitigation Complete' : 'Score Unchanged — Try Deep Fix'}
          </div>

          <h3 className="text-4xl font-display font-extrabold text-ink mb-12">Mitigation Results</h3>

          {/* Before / After Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col items-center p-8 bg-surface border border-surface/50 rounded">
              <BiasScoreGauge score={fixResult.before_score} title="Before Fix" />
              <div className="text-danger-default font-bold mt-6 tracking-wide text-sm">CRITICAL BIAS FOUND</div>
            </div>
            <div className={`flex flex-col items-center p-8 rounded border-2 ${
              improved ? 'border-brand-default bg-brand-surface' : 'border-warning-default bg-warning-surface'
            }`}>
              <BiasScoreGauge score={fixResult.after_score} title="After Fix" />
              <div className={`font-bold mt-6 flex items-center tracking-wide text-sm ${
                improved ? 'text-brand-default' : 'text-warning-default'
              }`}>
                {improved
                  ? <><span className="mr-2 text-lg leading-none">✓</span> COMPLIANCE THRESHOLD MET</>
                  : <><span className="mr-2 text-lg leading-none">⚠</span> THRESHOLD NOT MET</>}
              </div>
            </div>
          </div>

          {/* Score delta badge */}
          {improved && (
            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center gap-2 px-5 py-2 bg-success-surface rounded-full border border-success-default/30">
                <span className="text-success-default font-bold text-lg">↓ {delta} pts</span>
                <span className="text-success-default text-xs font-medium uppercase tracking-wider">bias reduced</span>
              </div>
            </div>
          )}

          {/* Post-fix fairness metrics */}
          {Object.keys(pm).length > 0 && (
            <div className="mt-12 bg-surface rounded p-6 border border-surface/70">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-4">Post-Fix Fairness Metrics</div>
              <MetricRow label="Disparate Impact"        value={pm.disparate_impact      ?? 0} thresholdOk={diOk}  />
              <MetricRow label="Equal Opportunity Diff"  value={pm.equal_opportunity_diff ?? 0} thresholdOk={eoOk}  />
              <MetricRow label="FNR Gap"                 value={pm.fnr_gap               ?? 0} thresholdOk={fnrOk} />
            </div>
          )}

          {/* Footer: verdict + downloads */}
          <div className="mt-16 pt-10 border-t border-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="text-ink-muted text-sm max-w-sm leading-relaxed">
              <div className="font-bold text-ink uppercase tracking-widest text-[10px] mb-2">Final Verdict</div>
              {improved
                ? <>Your model is now compliant with <b>EU AI Act Article 10</b> requirements regarding <b>{auditResult.recommended_metric}</b>.</>
                : <>The bias score did not improve. Consider switching to <b>Deep Fix</b> which retrains the model with reweighted data.</>}
            </div>
            <div className="flex flex-wrap gap-4">
              {improved && (
                <button
                  onClick={handleDownloadReport}
                  className="px-8 py-4 bg-ink text-paper font-bold rounded hover:bg-brand-default transition-colors duration-300"
                >
                  Download Compliance Report (.PDF)
                </button>
              )}
              <a
                href={fixResult.fixed_model_url}
                className="px-8 py-4 border border-surface text-ink font-bold rounded hover:bg-surface transition-colors duration-300"
              >
                Download Fixed Model (.PKL)
              </a>
              {!improved && (
                <button
                  onClick={() => { setFixResult(null); setPathway(null); }}
                  className="px-8 py-4 bg-success-default text-paper font-bold rounded hover:opacity-90 transition-opacity"
                >
                  Try Deep Fix Instead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pathway selector ───────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24">
      <div className="border-b border-surface pb-6 animate-stagger-1">
        <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">Mitigation Studio</h2>
        <p className="text-ink-muted mt-2">Choose how to mitigate bias for <b>{auditResult.recommended_metric}</b>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-stagger-2">
        {/* Quick Fix card */}
        <div
          onClick={() => handleFix('quick')}
          className="p-10 border border-surface rounded bg-paper cursor-pointer hover:border-brand-default hover:bg-brand-surface transition-all duration-300 group hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-brand-default font-extrabold text-2xl font-display group-hover:scale-[1.02] transition-transform origin-left">
              Quick Fix
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-brand-surface text-brand-default px-2 py-1 rounded border border-brand-default/30">
              Fairlearn
            </span>
          </div>
          <p className="text-ink-muted text-base leading-relaxed mb-6">
            Post-processing threshold optimisation. We don't touch your training data or model weights — we adjust the
            decision boundary to satisfy <b>{auditResult.recommended_metric}</b>.
          </p>
          <ul className="text-sm text-ink-faint space-y-2 mb-10 font-medium">
            <li className="flex items-center gap-2"><span className="text-success-default">✓</span> Ready in seconds</li>
            <li className="flex items-center gap-2"><span className="text-success-default">✓</span> Works for black-box models</li>
            <li className="flex items-center gap-2"><span className="text-ink-faint">~</span> Slight impact on accuracy</li>
          </ul>
          <button className="w-full py-4 bg-ink text-paper font-bold rounded group-hover:bg-brand-default transition-colors duration-300">
            Select Quick Fix
          </button>
        </div>

        {/* Deep Fix card */}
        <div
          onClick={() => handleFix('deep')}
          className="p-10 border border-surface rounded bg-paper cursor-pointer hover:border-success-default hover:bg-success-surface transition-all duration-300 group hover:-translate-y-1 hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-success-default font-extrabold text-2xl font-display group-hover:scale-[1.02] transition-transform origin-left">
              Deep Fix
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-success-surface text-success-default px-2 py-1 rounded border border-success-default/30">
              AIF360
            </span>
          </div>
          <p className="text-ink-muted text-base leading-relaxed mb-6">
            Pre-processing Reweighing. We fix the underlying data distribution bias and retrain a new
            RandomForest model. More robust and auditable for long-term compliance.
          </p>
          <ul className="text-sm text-ink-faint space-y-2 mb-10 font-medium">
            <li className="flex items-center gap-2"><span className="text-success-default">✓</span> Fixes bias at the source</li>
            <li className="flex items-center gap-2"><span className="text-success-default">✓</span> Higher long-term compliance confidence</li>
            <li className="flex items-center gap-2"><span className="text-ink-faint">~</span> Requires access to training data</li>
          </ul>
          <button className="w-full py-4 bg-ink text-paper font-bold rounded group-hover:bg-success-default transition-colors duration-300">
            Select Deep Fix
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixPage;
