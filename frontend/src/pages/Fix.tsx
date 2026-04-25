import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';
import MitigationWizard, { type FairnessMetric } from '../components/MitigationWizard';
import MitigationProcessing from '../components/MitigationProcessing';

// ── Metric label helpers ──────────────────────────────────────────────────────

// Maps wizard FairnessMetric enum → backend METRIC_ALIAS key
function metricApiKey(metric: FairnessMetric): string {
  const map: Record<FairnessMetric, string> = {
    demographic_parity: 'demographic_parity',
    equal_opportunity:  'equal_opportunity',
    equalized_odds:     'equalized_odds',
  };
  return map[metric];
}

// ── MetricRow sub-component ───────────────────────────────────────────────────

const MetricRow: React.FC<{ label: string; value: number; thresholdOk: boolean }> = ({
  label,
  value,
  thresholdOk,
}) => (
  <div className="flex items-center justify-between py-3 border-b border-surface last:border-0">
    <span className="text-sm font-medium text-ink-muted">{label}</span>
    <div className="flex items-center gap-3">
      <span className="font-mono font-bold text-ink text-sm">{value.toFixed(3)}</span>
      <span
        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
          thresholdOk
            ? 'bg-success-surface text-success-default'
            : 'bg-danger-surface text-danger-default'
        }`}
      >
        {thresholdOk ? 'PASS' : 'FAIL'}
      </span>
    </div>
  </div>
);

// ── Page flow types ───────────────────────────────────────────────────────────

type FlowState = 'wizard' | 'processing' | 'results';

// ── Main page component ───────────────────────────────────────────────────────

const FixPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    auditId,
    auditResult,
    setFixId,
    fixResult,
    setFixResult,
    clearFixResult,
  } = useAuditStore();

  // Determine initial flow state: skip wizard if we already have a fresh result
  // (e.g. user hit back). But we always clear on first mount to force re-run.
  const [flow, setFlow] = useState<FlowState>('wizard');
  const [selectedMetric, setSelectedMetric] = useState<FairnessMetric>('demographic_parity');
  const [selectedPathway, setSelectedPathway] = useState<'quick' | 'deep'>('quick');
  const [error, setError] = useState<string | null>(null);

  // ── On mount: clear any stale cached result so user runs fresh mitigation ──
  useEffect(() => {
    clearFixResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guard: no audit data → send home
  if (!auditId || !auditResult) {
    navigate('/');
    return null;
  }

  // ── Wizard "Execute" handler ──────────────────────────────────────────────
  const handleExecute = async (metric: FairnessMetric, pathway: 'quick' | 'deep') => {
    setSelectedMetric(metric);
    setSelectedPathway(pathway);
    setError(null);
    setFlow('processing');

    try {
      const res = await apiClient.startFix(auditId, pathway, metricApiKey(metric));
      setFixId(res.fix_id);
      setFixResult(res);
      setFlow('results');
    } catch (err: any) {
      console.error(err);
      if (err?.status === 404) {
        // Audit session lost (server restarted) — clear stale state and re-audit
        alert('Your audit session has expired (the server restarted). Please re-upload and re-run the audit.');
        navigate('/');
      } else {
        setError(err?.message || 'Mitigation failed. Please try again.');
        setFlow('wizard');
      }
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => navigate('/audit');

  // ── Download compliance report ────────────────────────────────────────────
  const handleDownloadReport = async () => {
    if (!fixResult) return;
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

  // ── Try again (retry with a different pathway) ────────────────────────────
  const handleRetry = () => {
    clearFixResult();
    setFlow('wizard');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: WIZARD
  // ─────────────────────────────────────────────────────────────────────────
  if (flow === 'wizard') {
    return (
      <div className="max-w-7xl mx-auto space-y-10 pb-24">
        {/* Page header */}
        <div className="border-b border-surface pb-6 animate-stagger-1">
          <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">
            Mitigation Studio
          </h2>
          <p className="text-ink-muted mt-2 text-sm">
            Guided setup — choose your fairness goal before we run the mitigation engine.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-danger-default/30 bg-danger-surface px-5 py-4 text-sm text-danger-default font-medium">
            {error}
          </div>
        )}

        <MitigationWizard onExecute={handleExecute} onCancel={handleCancel} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: PROCESSING
  // ─────────────────────────────────────────────────────────────────────────
  if (flow === 'processing') {
    return (
      <div className="max-w-7xl mx-auto pb-24">
        <MitigationProcessing pathway={selectedPathway} metric={selectedMetric} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: RESULTS  (fixResult is guaranteed non-null here)
  // ─────────────────────────────────────────────────────────────────────────
  if (!fixResult) return null;

  const improved = fixResult.after_score < fixResult.before_score;
  const delta = Math.round(fixResult.before_score - fixResult.after_score);
  const pm = fixResult.post_fix_metrics ?? {};
  const diOk  = (pm.disparate_impact ?? 0) >= 0.80;
  const eoOk  = Math.abs(pm.equal_opportunity_diff ?? 1) <= 0.05;
  const fnrOk = Math.abs(pm.fnr_gap ?? 1) <= 0.10;

  const pathwayLabel =
    fixResult.pathway === 'quick'
      ? 'Quick Fix · Fairlearn ThresholdOptimizer'
      : 'Deep Fix · AIF360 Reweighing + RandomForest';

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="border-b border-surface pb-6">
        <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">
          Mitigation Studio
        </h2>
        <p className="text-ink-muted text-sm mt-2">{pathwayLabel}</p>
      </div>

      {/* Results card */}
      <div className="bg-paper p-10 rounded border border-surface shadow-sm relative overflow-hidden">
        {/* Status badge */}
        <div
          className={`absolute top-0 right-0 py-2 px-6 font-bold text-[10px] uppercase tracking-[0.2em] rounded-bl ${
            improved
              ? 'bg-success-default text-paper'
              : 'bg-warning-default text-paper'
          }`}
        >
          {improved ? 'Mitigation Complete' : 'Score Unchanged — Try Deep Fix'}
        </div>

        <h3 className="text-4xl font-display font-extrabold text-ink mb-12">
          Mitigation Results
        </h3>

        {/* Before / After Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col items-center p-8 bg-surface border border-surface/50 rounded">
            <BiasScoreGauge score={fixResult.before_score} title="Before Fix" />
            <div className="text-danger-default font-bold mt-6 tracking-wide text-sm">
              CRITICAL BIAS FOUND
            </div>
          </div>
          <div
            className={`flex flex-col items-center p-8 rounded border-2 ${
              improved
                ? 'border-brand-default bg-brand-surface'
                : 'border-warning-default bg-warning-surface'
            }`}
          >
            <BiasScoreGauge score={fixResult.after_score} title="After Fix" />
            <div
              className={`font-bold mt-6 flex items-center tracking-wide text-sm ${
                improved ? 'text-brand-default' : 'text-warning-default'
              }`}
            >
              {improved ? (
                <>
                  <span className="mr-2 text-lg leading-none">✓</span>
                  COMPLIANCE THRESHOLD MET
                </>
              ) : (
                <>
                  <span className="mr-2 text-lg leading-none">⚠</span>
                  THRESHOLD NOT MET
                </>
              )}
            </div>
          </div>
        </div>

        {/* Score delta */}
        {improved && (
          <div className="flex justify-center mt-8">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-success-surface rounded-full border border-success-default/30">
              <span className="text-success-default font-bold text-lg">↓ {delta} pts</span>
              <span className="text-success-default text-xs font-medium uppercase tracking-wider">
                bias reduced
              </span>
            </div>
          </div>
        )}

        {/* Fairness metric used */}
        <div className="mt-8 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
            Fairness Metric Applied:
          </span>
          <span className="rounded-full bg-brand-surface border border-brand-default/20 px-3 py-0.5 text-[10px] font-bold text-brand-default uppercase tracking-widest">
            {selectedMetric.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Post-fix fairness metrics table */}
        {Object.keys(pm).length > 0 && (
          <div className="mt-12 bg-surface rounded p-6 border border-surface/70">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-4">
              Post-Fix Fairness Metrics
            </div>
            <MetricRow label="Disparate Impact"       value={pm.disparate_impact      ?? 0} thresholdOk={diOk}  />
            <MetricRow label="Equal Opportunity Diff" value={pm.equal_opportunity_diff ?? 0} thresholdOk={eoOk}  />
            <MetricRow label="FNR Gap"                value={pm.fnr_gap               ?? 0} thresholdOk={fnrOk} />
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-10 border-t border-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="text-ink-muted text-sm max-w-sm leading-relaxed">
            <div className="font-bold text-ink uppercase tracking-widest text-[10px] mb-2">
              Final Verdict
            </div>
            {improved ? (
              <>
                Your model is now compliant with{' '}
                <b>EU AI Act Article 10</b> requirements regarding{' '}
                <b>{auditResult.recommended_metric}</b>.
              </>
            ) : (
              <>
                The bias score did not improve. Consider switching to{' '}
                <b>Deep Fix</b> which retrains the model with reweighted data.
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            {improved && (
              <button
                onClick={handleDownloadReport}
                id="download-report-btn"
                className="px-8 py-4 bg-ink text-paper font-bold rounded hover:bg-brand-default transition-colors duration-300"
              >
                Download Compliance Report (.PDF)
              </button>
            )}
            <a
              href={fixResult.fixed_model_url}
              id="download-model-btn"
              className="px-8 py-4 border border-surface text-ink font-bold rounded hover:bg-surface transition-colors duration-300"
            >
              Download Fixed Model (.PKL)
            </a>
            {!improved && (
              <button
                id="retry-btn"
                onClick={handleRetry}
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
};

export default FixPage;
