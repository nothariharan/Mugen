import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Download, RefreshCw,
  TrendingDown, FileText, Package, Info,
} from 'lucide-react';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';
import MitigationWizard, { type FairnessMetric } from '../components/MitigationWizard';
import MitigationProcessing from '../components/MitigationProcessing';

function metricApiKey(metric: FairnessMetric): string {
  return metric; // enum values already match backend keys
}

// ── MetricRow ─────────────────────────────────────────────────────────────────
const MetricRow: React.FC<{ label: string; value: number; thresholdOk: boolean }> = ({
  label, value, thresholdOk,
}) => (
  <div className="flex items-center justify-between py-3.5 border-b border-surface last:border-0">
    <span className="text-sm font-medium text-ink-muted">{label}</span>
    <div className="flex items-center gap-3">
      <span className="font-mono font-bold text-ink text-sm tabular-nums">{value.toFixed(3)}</span>
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
          thresholdOk
            ? 'bg-success-surface text-success-default'
            : 'bg-danger-surface text-danger-default'
        }`}
      >
        {thresholdOk
          ? <><CheckCircle2 className="h-2.5 w-2.5" />PASS</>
          : <><AlertTriangle className="h-2.5 w-2.5" />FAIL</>
        }
      </span>
    </div>
  </div>
);

type FlowState = 'wizard' | 'processing' | 'results';

// ── Main ──────────────────────────────────────────────────────────────────────
const FixPage: React.FC = () => {
  const navigate = useNavigate();
  const { auditId, auditResult, setFixId, fixResult, setFixResult, clearFixResult } = useAuditStore();

  const [flow, setFlow] = useState<FlowState>('wizard');
  const [selectedMetric, setSelectedMetric] = useState<FairnessMetric>('demographic_parity');
  const [selectedPathway, setSelectedPathway] = useState<'quick' | 'deep'>('quick');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearFixResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!auditId || !auditResult) { navigate('/'); return null; }

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
        alert('Your audit session has expired (the server restarted). Please re-upload and re-run the audit.');
        navigate('/');
      } else {
        setError(err?.message || 'Mitigation failed. Please try again.');
        setFlow('wizard');
      }
    }
  };

  const handleCancel = () => navigate('/audit');
  const handleRetry = () => { clearFixResult(); setFlow('wizard'); };

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

  // ── WIZARD ──────────────────────────────────────────────────────────────────
  if (flow === 'wizard') {
    return (
      <div className="max-w-7xl mx-auto space-y-10 pb-24">
        <div className="border-b border-surface pb-6 animate-stagger-1">
          <button
            onClick={() => navigate('/audit')}
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to audit
          </button>
          <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">
            Mitigation Studio
          </h2>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed max-w-xl">
            Guided setup — choose your fairness goal before we run the mitigation engine.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-md bg-danger-surface px-5 py-4 text-sm text-danger-default font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <MitigationWizard onExecute={handleExecute} onCancel={handleCancel} />
      </div>
    );
  }

  // ── PROCESSING ──────────────────────────────────────────────────────────────
  if (flow === 'processing') {
    return (
      <div className="max-w-7xl mx-auto pb-24">
        <MitigationProcessing pathway={selectedPathway} metric={selectedMetric} />
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (!fixResult) return null;

  const improved = fixResult.after_score < fixResult.before_score;
  const isDeepFix = fixResult.pathway === 'deep';
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
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-stagger-1">
      {/* Header */}
      <div className="border-b border-surface pb-6">
        <button
          onClick={() => navigate('/audit')}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to audit
        </button>
        <h2 className="text-5xl font-display font-extrabold text-ink leading-tight tracking-tight">
          Mitigation Studio
        </h2>
        <p className="text-ink-muted text-sm mt-2 font-medium">{pathwayLabel}</p>
      </div>

      {/* Results card */}
      <div className="bg-paper rounded-lg border border-surface shadow-sm overflow-hidden">
        {/* Status bar — top of card (no border-left stripe) */}
        <div className={`px-8 py-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
          improved
            ? 'bg-success-surface text-success-default'
            : 'bg-warning-surface text-warning-default'
        }`}>
          {improved
            ? <><CheckCircle2 className="h-3.5 w-3.5" />Mitigation Complete</>
            : isDeepFix
              ? <><AlertTriangle className="h-3.5 w-3.5" />Score Unchanged — Review Dataset</>
              : <><AlertTriangle className="h-3.5 w-3.5" />Score Unchanged — Try Deep Fix</>
          }
        </div>

        <div className="p-10">
          <h3 className="text-4xl font-display font-extrabold text-ink mb-12">
            Mitigation Results
          </h3>

          {/* Before / After Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-center p-8 bg-surface rounded-lg">
              <BiasScoreGauge score={fixResult.before_score} title="Before Fix" />
              <div className="flex items-center gap-2 text-danger-default font-bold mt-6 tracking-wide text-sm">
                <AlertTriangle className="h-4 w-4" />
                CRITICAL BIAS FOUND
              </div>
            </div>
            <div className={`flex flex-col items-center p-8 rounded-lg border-2 ${
              improved
                ? 'border-brand-default bg-brand-surface'
                : 'border-warning-default bg-warning-surface'
            }`}>
              <BiasScoreGauge score={fixResult.after_score} title="After Fix" />
              <div className={`font-bold mt-6 flex items-center gap-2 tracking-wide text-sm ${
                improved ? 'text-brand-default' : 'text-warning-default'
              }`}>
                {improved
                  ? <><CheckCircle2 className="h-4 w-4" />COMPLIANCE THRESHOLD MET</>
                  : <><AlertTriangle className="h-4 w-4" />THRESHOLD NOT MET</>
                }
              </div>
            </div>
          </div>

          {/* Score delta */}
          {improved && (
            <div className="flex justify-center mt-8">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-success-surface rounded-full">
                <TrendingDown className="h-4 w-4 text-success-default" />
                <span className="text-success-default font-bold text-base">
                  {delta} pts bias reduction
                </span>
              </div>
            </div>
          )}

          {/* Fairness metric used */}
          <div className="mt-8 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-ink-faint" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
              Fairness Metric Applied:
            </span>
            <span className="rounded-full bg-brand-surface px-3 py-0.5 text-[10px] font-bold text-brand-default uppercase tracking-widest">
              {selectedMetric.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Post-fix metrics table */}
          {Object.keys(pm).length > 0 && (
            <div className="mt-12 bg-surface rounded-lg p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-4">
                Post-Fix Fairness Metrics
              </p>
              <MetricRow label="Disparate Impact"       value={pm.disparate_impact      ?? 0} thresholdOk={diOk}  />
              <MetricRow label="Equal Opportunity Diff" value={pm.equal_opportunity_diff ?? 0} thresholdOk={eoOk}  />
              <MetricRow label="FNR Gap"                value={pm.fnr_gap               ?? 0} thresholdOk={fnrOk} />
            </div>
          )}

          {/* Footer */}
          <div className="mt-14 pt-10 border-t border-surface flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="text-ink-muted text-sm max-w-sm leading-relaxed">
              <p className="font-bold text-ink uppercase tracking-widest text-[10px] mb-2">Final Verdict</p>
              {improved ? (
                <>
                  Your model is now compliant with{' '}
                  <strong>EU AI Act Article 10</strong> requirements regarding{' '}
                  <strong>{auditResult.recommended_metric}</strong>.
                </>
              ) : isDeepFix ? (
                <>
                  Deep Fix ran but the bias score did not improve. AIF360 Reweighing may be insufficient for this
                  distribution — try <strong>adjusting the fairness metric</strong> or reviewing the dataset for
                  structural imbalances.
                </>
              ) : (
                <>
                  The bias score did not improve. Consider switching to{' '}
                  <strong>Deep Fix</strong> which retrains with reweighted data.
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {improved && (
                <button
                  onClick={handleDownloadReport}
                  id="download-report-btn"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-ink text-paper font-bold rounded-md hover:bg-brand-default transition-colors duration-200 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Compliance Report (.PDF)
                </button>
              )}
              <a
                href={fixResult.fixed_model_url}
                id="download-model-btn"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-surface text-ink font-bold rounded-md hover:bg-surface transition-colors duration-200 text-sm"
              >
                <Package className="h-4 w-4" />
                Fixed Model (.PKL)
              </a>
              {!improved && (
                <button
                  id="retry-btn"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-default text-paper font-bold rounded-md hover:bg-brand-hover transition-colors duration-200 text-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  {isDeepFix ? 'Try Different Metric' : 'Try Deep Fix Instead'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixPage;
