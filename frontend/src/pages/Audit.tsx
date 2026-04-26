import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, XCircle, Scale, Target, Search,
  Gavel, Brain, TrendingDown, ArrowRight, Loader2,
  BadgeCheck, ShieldX, Info, ChevronRight,
} from 'lucide-react';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';
import AequitasGrid from '../components/AequitasGrid';
import ModelExplorer from '../components/ModelExplorer';
import ShapWaterfall from '../components/ShapWaterfall';
import ViewToggle, { type ViewMode } from '../components/ViewToggle';

const contentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const sectionLabelClassName = 'mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-faint';

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTopProxyFeature(topProxyFeatures: unknown): string | null {
  if (Array.isArray(topProxyFeatures)) {
    const first = topProxyFeatures[0];
    return typeof first === 'string' ? first : null;
  }
  if (topProxyFeatures && typeof topProxyFeatures === 'object') {
    const [first] = Object.keys(topProxyFeatures as Record<string, number>);
    return first || null;
  }
  return null;
}

function inferGroupsFromPoints(points: any[] = []): { priv: string; unpriv: string } {
  const groups = Array.from(
    new Set(points.map((p) => p?.group).filter((g): g is string => typeof g === 'string' && g.trim().length > 0)),
  );
  const unpriv = groups.find((g) => !['male', 'white', 'majority'].includes(g.toLowerCase())) || groups[0] || 'Disadvantaged group';
  const priv = groups.find((g) => g !== unpriv) || 'Reference group';
  return { priv, unpriv };
}

// ── Mini bar for approval rate comparisons ───────────────────────────────────
function ApprovalBar({ label, pct, isPriv }: { label: string; pct: number; isPriv: boolean }) {
  const filled = Math.max(pct > 0 ? 3 : 0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium text-ink-muted truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isPriv ? 'bg-brand-default' : pct < 10 ? 'bg-danger-default' : 'bg-warning-default'
          }`}
          style={{ width: `${filled}%` }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-bold text-ink tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

// ── Severity timeline ─────────────────────────────────────────────────────────
type SeverityStatus = 'green' | 'amber' | 'red';
function SeverityTimeline({ items }: { items: { label: string; status: SeverityStatus; sub?: string }[] }) {
  return (
    <div className="flex items-start gap-1">
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <div className="flex flex-col items-center gap-1.5 text-center flex-1 min-w-0">
            {item.status === 'green'
              ? <CheckCircle2 className="h-4 w-4 text-success-default" />
              : item.status === 'amber'
                ? <AlertTriangle className="h-4 w-4 text-warning-default" />
                : <XCircle className="h-4 w-4 text-danger-default" />
            }
            <span className="text-[9px] font-bold uppercase tracking-wide text-ink-muted leading-tight">{item.label}</span>
            {item.sub && <span className="text-[8px] text-ink-faint leading-tight">{item.sub}</span>}
          </div>
          {i < items.length - 1 && <div className="shrink-0 mt-2 h-px w-3 bg-surface" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function getHeroTone(score: number) {
  if (score < 30) {
    return {
      label: 'LOW BIAS DETECTED',
      icon: <CheckCircle2 className="h-5 w-5 text-success-default" />,
      background: 'oklch(0.97 0.02 150)',
      border: 'oklch(0.6 0.15 150)',
      badge: 'bg-success-surface text-success-default',
    };
  }
  if (score <= 60) {
    return {
      label: 'MODERATE BIAS DETECTED',
      icon: <AlertTriangle className="h-5 w-5 text-warning-default" />,
      background: 'oklch(0.97 0.03 70)',
      border: 'oklch(0.7 0.15 65)',
      badge: 'bg-warning-surface text-warning-default',
    };
  }
  return {
    label: 'HIGH BIAS DETECTED',
    icon: <XCircle className="h-5 w-5 text-danger-default" />,
    background: 'oklch(0.97 0.02 30)',
    border: 'oklch(0.55 0.18 30)',
    badge: 'bg-danger-surface text-danger-default',
  };
}

function MetricStatusDot({ color }: { color: 'red' | 'amber' | 'green' }) {
  if (color === 'green') return <CheckCircle2 className="h-4 w-4 text-success-default" />;
  if (color === 'amber') return <AlertTriangle className="h-4 w-4 text-warning-default" />;
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-default opacity-40" />
      <XCircle className="relative h-4 w-4 text-danger-default" />
    </span>
  );
}

const AuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId, auditId, domain, labelCol, sensitiveCol, setAuditId, auditResult, setAuditResult } = useAuditStore();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('plain');
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (!uploadId) {
      navigate('/');
      return;
    }

    const start = async () => {
      try {
        const { audit_id } = await apiClient.startAudit(uploadId, domain, labelCol, sensitiveCol);
        setAuditId(audit_id);

        const poll = setInterval(async () => {
          const res = await apiClient.pollAudit(audit_id);
          if (res.status === 'done') {
            setAuditResult(res.result);
            setLoading(false);
            clearInterval(poll);
          } else if (res.status === 'error') {
            clearInterval(poll);
            setLoading(false);
            alert(`Audit Failed: ${res.message || 'Unknown server error'}`);
            navigate('/');
          }
        }, 1500);
      } catch (err) {
        console.error(err);
      }
    };

    start();
  }, [uploadId, domain, navigate, setAuditId, setAuditResult]);

  useEffect(() => {
    if (typeof auditResult?.bias_score !== 'number') {
      return;
    }

    const target = auditResult.bias_score;
    const duration = 800;
    const startTime = performance.now();
    let animationFrame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target * 10) / 10);
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    setDisplayScore(0);
    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [auditResult?.bias_score, viewMode]);

  const fairnessMetrics = auditResult?.fairness_metrics || {};
  const dataPoints = auditResult?.model_explorer_points || [];
  const topProxyFeature = getTopProxyFeature(auditResult?.proxy_leakage?.top_proxy_features);
  const topShapFeature = useMemo(() => {
    const shapValues = auditResult?.shap_values;
    if (Array.isArray(shapValues)) { const [first] = shapValues; return first?.feature || null; }
    if (shapValues && typeof shapValues === 'object') return Object.keys(shapValues)[0] || null;
    return null;
  }, [auditResult?.shap_values]);

  // Group labels — prefer backend-supplied, fall back to point inference
  const { priv: privFromPoints, unpriv: unprivFromPoints } = inferGroupsFromPoints(dataPoints);
  const privLabel: string  = auditResult?.priv_label  || privFromPoints;
  const unprivLabel: string = auditResult?.unpriv_label || unprivFromPoints;

  const heroTone = getHeroTone(auditResult?.bias_score ?? 0);
  const disparateImpact    = Number(fairnessMetrics.disparate_impact      ?? 1);
  const equalOpportunityDiff = Number(fairnessMetrics.equal_opportunity_diff ?? 0);
  const fnrGap             = Number(fairnessMetrics.fnr_gap               ?? 0);
  const leakageScore       = Number(auditResult?.proxy_leakage?.leakage_score ?? 0);
  const spd                = Number(fairnessMetrics.statistical_parity_difference ?? 0);

  // Compute concrete approval rates from DI + SPD
  let privApprovalPct: number;
  let unprivApprovalPct: number;
  if (disparateImpact <= 0.001) {
    privApprovalPct  = Math.min(100, Math.max(0, Math.abs(spd) * 100));
    unprivApprovalPct = 0;
  } else if (Math.abs(disparateImpact - 1) < 0.01) {
    privApprovalPct  = Math.max(0, (Math.abs(spd) / 2 + 0.5) * 100);
    unprivApprovalPct = privApprovalPct;
  } else {
    const pPriv = Math.min(1, Math.max(0, spd / (disparateImpact - 1)));
    privApprovalPct  = pPriv * 100;
    unprivApprovalPct = pPriv * disparateImpact * 100;
  }

  // Estimated per-group FNR (we only have the gap, not absolute rates)
  const estPrivFNR   = Math.max(0, Math.round(Math.max(10, 30 - Math.abs(fnrGap) * 30)));
  const estUnprivFNR = Math.min(100, Math.round(estPrivFNR + Math.abs(fnrGap) * 100));

  const dataQualityOk = (auditResult?.data_profile?.missing_pct ?? 0) < 5;
  const severityItems: { label: string; status: SeverityStatus; sub?: string }[] = [
    { label: 'Data Quality',    status: dataQualityOk ? 'green' : 'amber' },
    { label: 'Approval Gap',    status: disparateImpact < 0.8 ? 'red' : 'green' },
    { label: 'Error Rates',     status: Math.abs(equalOpportunityDiff) > 0.05 ? 'red' : 'green' },
    { label: 'Hidden Signals',  status: leakageScore > 0.75 ? 'red' : leakageScore > 0.5 ? 'amber' : 'green' },
    { label: 'Overall',         status: (auditResult?.bias_score ?? 0) > 50 ? 'red' : (auditResult?.bias_score ?? 0) > 30 ? 'amber' : 'green',
      sub: `Score ${(auditResult?.bias_score ?? 0).toFixed(0)}/100` },
  ];

  const domainRegsMap: Record<string, string[]> = {
    hiring:     ['EU AI Act Article 10', 'NYC Local Law 144', 'EEOC 80% Rule'],
    finance:    ['EU AI Act Article 10', 'Equal Credit Opportunity Act (ECOA)'],
    healthcare: ['EU AI Act Article 14', 'ACA Section 1557'],
  };
  const triggeredRegs = domainRegsMap[domain] || domainRegsMap.hiring;


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-brand-default animate-spin" />
        <p className="text-brand-default font-bold uppercase tracking-widest text-xs animate-pulse">Phase 1: Detect, Profile &amp; Slicing</p>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-16 ${viewMode === 'technical' ? 'pb-32' : 'pb-24'}`}>
      <div className="flex flex-col items-start gap-6 border-b border-surface pb-8 animate-stagger-1">
        <div>
          <div className="mb-4 flex items-center space-x-3">
            <span className="rounded-sm bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">{domain} domain</span>
            <span className="text-surface">|</span>
            <span className="text-[10px] font-mono text-ink-faint">ID: {uploadId}</span>
          </div>
          <h2 className="text-5xl font-display font-extrabold leading-none tracking-tight text-ink">Audit Results</h2>
        </div>
        {/* Verdict banner — no border-left stripe, uses top/bottom semantic fill instead */}
        <div className={`w-full rounded-lg px-5 py-4 flex items-start gap-3 ${disparateImpact < 0.8 ? 'bg-danger-surface' : 'bg-success-surface'}`}>
          {disparateImpact < 0.8
            ? <ShieldX className="h-5 w-5 text-danger-default shrink-0 mt-0.5" />
            : <BadgeCheck className="h-5 w-5 text-success-default shrink-0 mt-0.5" />
          }
          <div>
            <p className={`font-bold text-sm ${disparateImpact < 0.8 ? 'text-danger-default' : 'text-success-default'}`}>
              {disparateImpact < 0.8
                ? `This model cannot be legally deployed for ${domain} decisions.`
                : `This model meets fairness requirements for ${domain} decisions.`}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              {disparateImpact < 0.8
                ? `It discriminates against ${unprivLabel} — approval rate falls below the legal 80% minimum. Score: ${(auditResult?.bias_score ?? 0).toFixed(0)}/100`
                : `All key fairness metrics are within legal thresholds. Score: ${(auditResult?.bias_score ?? 0).toFixed(0)}/100`}
            </p>
          </div>
        </div>
        <div className="w-full">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {viewMode === 'plain' ? (
          <motion.div key="plain" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
            <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
              <motion.section
                variants={cardVariants}
                className="rounded-xl border-l-4 p-8 shadow-sm"
                style={{ backgroundColor: heroTone.background, borderLeftColor: heroTone.border }}
              >
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{heroTone.icon}</span>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-ink">{heroTone.label}</p>
                    </div>
                    <p className="max-w-3xl text-2xl font-medium leading-relaxed text-ink">
                      &ldquo;{auditResult.plain_english_summary}&rdquo;
                    </p>
                    <button onClick={() => navigate('/fix')} className="inline-flex items-center rounded-lg bg-ink px-6 py-3 text-sm font-bold text-paper transition-colors duration-300 hover:bg-brand-default">
                      Fix This Now →
                    </button>
                  </div>
                  <div className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${heroTone.badge}`}>Bias Score: {displayScore.toFixed(1)}</div>
                </div>
              </motion.section>

              <motion.section variants={cardVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <article className="rounded-lg border border-surface bg-paper p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <Scale className="h-5 w-5 text-ink-muted" />
                    <MetricStatusDot color={disparateImpact < 0.8 ? 'red' : 'green'} />
                  </div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Approval Gap</p>
                  <p className="mb-4 text-sm font-medium leading-6 text-ink">
                    {disparateImpact <= 0.05 ? `${unprivLabel.charAt(0).toUpperCase()+unprivLabel.slice(1)} are receiving almost zero approvals.` : disparateImpact < 0.8 ? `${unprivLabel.charAt(0).toUpperCase()+unprivLabel.slice(1)} are approved significantly less often than ${privLabel}.` : `Approval rates are roughly equal between ${privLabel} and ${unprivLabel}.`}
                  </p>
                  <div className="space-y-2 mb-4">
                    <ApprovalBar label={privLabel.charAt(0).toUpperCase()+privLabel.slice(1)} pct={privApprovalPct} isPriv />
                    <ApprovalBar label={unprivLabel.charAt(0).toUpperCase()+unprivLabel.slice(1)} pct={unprivApprovalPct} isPriv={false} />
                  </div>
                  <p className="text-xs text-ink-faint">Legal minimum: 80% rule (EEOC)</p>
                </article>

                <article className="rounded-lg border border-surface bg-paper p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <Target className="h-5 w-5 text-ink-muted" />
                    <MetricStatusDot color={Math.abs(equalOpportunityDiff) > 0.05 ? 'red' : 'green'} />
                  </div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Missed Qualified People</p>
                  <p className="mb-4 text-sm font-medium leading-6 text-ink">
                    {Math.abs(equalOpportunityDiff) > 0.05 ? `The model wrongly turns away qualified ${unprivLabel} it would approve if they were ${privLabel}.` : `Error rates are acceptably equal — qualified ${unprivLabel} aren't being unfairly turned away.`}
                  </p>
                  <div className="space-y-2 mb-4">
                    <ApprovalBar label={`${privLabel.charAt(0).toUpperCase()+privLabel.slice(1)} wrongly denied`} pct={estPrivFNR} isPriv />
                    <ApprovalBar label={`${unprivLabel.charAt(0).toUpperCase()+unprivLabel.slice(1)} wrongly denied`} pct={estUnprivFNR} isPriv={false} />
                  </div>
                  <p className="text-xs text-ink-faint">Threshold: &lt; 5% difference in error rates</p>
                </article>

                <article className="rounded-lg border border-surface bg-paper p-5 shadow-sm">
                  <div className="mb-4 flex items-start justify-between">
                    <Search className="h-5 w-5 text-ink-muted" />
                    <MetricStatusDot color={leakageScore > 0.75 ? 'red' : leakageScore > 0.5 ? 'amber' : 'green'} />
                  </div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-faint">Hidden Bias Check</p>
                  <p className="mb-4 text-sm font-medium leading-6 text-ink">
                    {leakageScore > 0.75 ? `"${formatLabel(topProxyFeature||'Key variables')}" is acting as a backdoor stand-in for demographic identity.` : leakageScore > 0.5 ? 'Some features may indirectly encode demographic information through correlations.' : `Good news — the model isn't sneaking demographic information in through backdoor features like job title or ZIP code.`}
                  </p>
                  <p className="text-xs text-ink-faint">{leakageScore > 0.5 ? 'Proxy pattern detected in model inputs.' : 'No meaningful proxy pattern detected above threshold.'}</p>
                </article>
              </motion.section>

              <motion.section variants={cardVariants} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Audit Trail — At a Glance</p>
                <SeverityTimeline items={severityItems} />
              </motion.section>

              <motion.section variants={cardVariants} className="rounded-lg border border-surface bg-paper p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-4 w-4 text-ink-muted" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Why is the model biased?</p>
                </div>
                <p className="text-base font-medium leading-7 text-ink">
                  The strongest driver of unfair denials is &ldquo;{formatLabel(topShapFeature||'key model features')}&rdquo; — a feature that may indirectly encode demographic information.
                </p>
                {topShapFeature && (
                  <p className="mt-3 text-sm leading-7 text-ink-muted">
                    In this dataset, {unprivLabel} are disproportionately represented in the &ldquo;{formatLabel(topShapFeature)}&rdquo; categories that the model penalises most heavily.
                  </p>
                )}
              </motion.section>

              <motion.section variants={cardVariants} className="rounded-lg border border-surface bg-surface/50 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Gavel className="h-4 w-4 text-ink-muted" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">What this means legally</p>
                </div>
                <p className="text-sm leading-7 text-ink-muted mb-4">
                  {disparateImpact < 0.8 ? `Under the regulations below, this model cannot be legally deployed for ${domain} decisions in its current state. ${unprivLabel.charAt(0).toUpperCase()+unprivLabel.slice(1)} are approved at a rate far below the legal minimum.` : `This model currently meets the fairness thresholds required for ${domain} decisions. Continue monitoring with each model update.`}
                </p>
                <ul className="space-y-1.5 mb-5">
                  {triggeredRegs.map((r) => (
                    <li key={r} className="flex items-center gap-2 text-xs text-ink-muted">
                      <CheckCircle2 className="h-3 w-3 text-brand-default shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/fix')}
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-colors duration-200 hover:bg-brand-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-default"
                >
                  Fix This Model
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.section>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="technical" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
            {/* Reading guide — Fix 9 */}
            <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-medium text-ink-faint">
              <span className="font-bold uppercase tracking-widest text-ink-muted">Read in order:</span>
              {['① Bias Score','② Root Cause (SHAP)','③ Affected Groups (Aequitas)','④ Proxy Risk','⑤ Individual Cases'].map((s) => (
                <span key={s} className="rounded-full bg-surface px-3 py-1 text-ink-muted">{s}</span>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              <div className="space-y-10 lg:col-span-4">
                <section>
                  <p className={sectionLabelClassName}>Composite Bias Score</p>
                  <BiasScoreGauge score={displayScore} />
                </section>

                <section>
                  <p className={sectionLabelClassName}>Executive Finding</p>
                  <div className="border-l-4 border-brand-default pl-6 py-2">
                    <p className="text-lg font-medium leading-relaxed text-ink-muted">
                      "{auditResult.plain_english_summary}"
                    </p>
                  </div>
                </section>

                <section>
                  <p className={sectionLabelClassName}>Intersectional Slice Review</p>
                  <div className="rounded border border-surface bg-paper p-6">
                    {auditResult.intersectional_slices?.length > 0 ? (
                      <>
                        <p className="mb-4 text-xs text-ink-muted">Highest-risk subgroups identified by the bias slicer:</p>
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-surface"><th className="pb-2 text-left font-bold text-ink-faint uppercase tracking-wider">Group</th><th className="pb-2 text-right font-bold text-ink-faint uppercase tracking-wider">FNR Gap</th><th className="pb-2 text-right font-bold text-ink-faint uppercase tracking-wider">Risk</th></tr></thead>
                          <tbody>
                            {auditResult.intersectional_slices.map((slice: any, i: number) => {
                              const fnrPct = Math.round(slice.fnr_gap * 100);
                              const risk = fnrPct >= 40 ? { label:'HIGH', cls:'text-red-600 bg-red-50' } : fnrPct >= 20 ? { label:'MEDIUM', cls:'text-amber-600 bg-amber-50' } : { label:'LOW', cls:'text-green-600 bg-green-50' };
                              return (
                                <tr key={i} className="border-b border-surface/50 last:border-0">
                                  <td className="py-3 font-medium text-ink pr-2">{slice.group}</td>
                                  <td className="py-3 text-right font-bold text-danger-default">+{fnrPct}%</td>
                                  <td className="py-3 text-right"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${risk.cls}`}>{risk.label}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <p className="text-sm text-ink-muted">No high-risk intersectional subgroups detected above 30% FNR gap threshold.</p>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-12 lg:col-span-8">
                <section>
                  <p className={sectionLabelClassName}>Disparate Impact Analysis</p>
                  <AequitasGrid metrics={auditResult.fairness_metrics} />
                </section>

                <section>
                  <p className={sectionLabelClassName}>Compliance Summary</p>
                  <div className="rounded border border-surface bg-paper p-6 space-y-4">
                    {auditResult?.article_10 ? (
                      <><div><p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">Article 10 — Data Governance</p><p className="text-sm leading-6 text-ink-muted">{auditResult.article_10}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">Article 12 — Record Keeping</p><p className="text-sm leading-6 text-ink-muted">{auditResult.article_12 || `Audit ID ${auditId} logged.`}</p></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-1">Article 14 — Human Oversight</p><p className="text-sm leading-6 text-ink-muted">{auditResult.article_14}</p></div></>
                    ) : (
                      <>
                        <p className="text-sm leading-6 text-ink-muted">
                          {disparateImpact < 0.8
                            ? `Disparate Impact ratio of ${disparateImpact.toFixed(2)} falls below the ${domain === 'hiring' ? 'EEOC 80% rule' : 'legal threshold'} minimum of 0.80. This constitutes a compliance violation requiring remediation before deployment.`
                            : `All measured fairness metrics are within the required thresholds for the ${domain} domain. This audit is on record for regulatory inspection purposes.`}
                        </p>
                        <div className="pt-2 border-t border-surface">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">Regulations triggered</p>
                          <div className="flex flex-wrap gap-2">{triggeredRegs.map((r) => <span key={r} className="text-[10px] bg-surface rounded px-2 py-1 text-ink-muted">{r}</span>)}</div>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  <section>
                    <p className={sectionLabelClassName}>Feature Attribution (SHAP)</p>
                    <ShapWaterfall data={auditResult.proxy_leakage?.top_proxy_features || {}} />
                  </section>

                  <section>
                    <p className={sectionLabelClassName}>Proxy Leakage Detection</p>
                    <div className="flex h-full flex-col justify-between rounded border border-surface bg-paper p-8">
                      <div>
                        <h4 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Proxy Leakage</h4>
                        <div className="mb-3 text-4xl font-display font-extrabold text-ink">{auditResult.proxy_leakage?.leakage_score}</div>
                        <p className="text-sm leading-relaxed text-ink-muted">
                          Score above <b>0.75</b> suggests features are acting as strong proxies for protected attributes (leakage occurs).
                        </p>
                      </div>
                      <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full ${auditResult.proxy_leakage?.leakage_score > 0.7 ? 'bg-danger-default' : 'bg-success-default'}`}
                          style={{ width: `${auditResult.proxy_leakage?.leakage_score * 100}%` }}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="animate-stagger-5">
        <ModelExplorer dataPoints={dataPoints} auditId={auditId} />
      </div>

      {viewMode === 'technical' ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl justify-end px-2">
            <button
              onClick={() => navigate('/fix')}
              className="rounded-lg bg-brand-default px-6 py-3 text-sm font-bold text-paper transition-colors duration-300 hover:bg-ink"
            >
              Mitigate Bias →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AuditPage;
