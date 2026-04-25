import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

function inferAffectedGroup(points: any[] = []) {
  const groups = Array.from(
    new Set(
      points
        .map((point) => point?.group)
        .filter((group): group is string => typeof group === 'string' && group.trim().length > 0),
    ),
  );

  const preferredGroup = groups.find((group) => {
    const lower = group.toLowerCase();
    return !['male', 'white'].includes(lower);
  });

  return preferredGroup || groups[0] || 'Affected group';
}

function getHeroTone(score: number) {
  if (score < 30) {
    return {
      label: 'LOW BIAS DETECTED',
      icon: '🟢',
      background: '#F0FDF4',
      border: '#22C55E',
      badge: 'bg-green-100 text-green-800',
    };
  }

  if (score <= 60) {
    return {
      label: 'MODERATE BIAS DETECTED',
      icon: '🟡',
      background: '#FFFBEB',
      border: '#F59E0B',
      badge: 'bg-amber-100 text-amber-800',
    };
  }

  return {
    label: 'HIGH BIAS DETECTED',
    icon: '🔴',
    background: '#FEF2F2',
    border: '#EF4444',
    badge: 'bg-red-100 text-red-800',
  };
}

function MetricStatusDot({ color }: { color: 'red' | 'amber' | 'green' }) {
  const colorMap = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  };

  return (
    <span className="relative flex h-3 w-3 items-center justify-center">
      {color === 'red' ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" /> : null}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorMap[color]}`} />
    </span>
  );
}

const AuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId, auditId, domain, setAuditId, auditResult, setAuditResult } = useAuditStore();
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
        const { audit_id } = await apiClient.startAudit(uploadId, domain);
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
    if (Array.isArray(shapValues)) {
      const [first] = shapValues;
      return first?.feature || null;
    }

    if (shapValues && typeof shapValues === 'object') {
      const [first] = Object.keys(shapValues);
      return first || null;
    }

    return null;
  }, [auditResult?.shap_values]);
  const affectedGroup = inferAffectedGroup(dataPoints);
  const heroTone = getHeroTone(auditResult?.bias_score ?? 0);
  const disparateImpact = Number(fairnessMetrics.disparate_impact ?? 1);
  const equalOpportunityDiff = Number(fairnessMetrics.equal_opportunity_diff ?? 0);
  const leakageScore = Number(auditResult?.proxy_leakage?.leakage_score ?? 0);
  const legalText =
    auditResult?.compliance_paragraph ||
    auditResult?.gemini_compliance_paragraph ||
    auditResult?.plain_english_summary ||
    'This audit raises fairness concerns that may require review under hiring and automated decision-making regulations.';

  const approvalGapText =
    disparateImpact < 0.5
      ? `${affectedGroup} approved ${Math.round((1 - disparateImpact) * 100)}% less often`
      : disparateImpact < 0.8
        ? `${affectedGroup} approved ${Math.round((1 - disparateImpact) * 100)}% less often - below legal threshold`
        : 'Approval rates are roughly equal across groups ✓';

  const errorRateText =
    Math.abs(equalOpportunityDiff) > 0.05
      ? `When qualified, ${affectedGroup} is still denied ${Math.abs(Math.round(equalOpportunityDiff * 100))}% more often`
      : 'Error rates are acceptably equal across groups ✓';

  const hiddenBiasText =
    leakageScore > 0.75
      ? `Features like ${formatLabel(topProxyFeature || 'key variables')} are acting as stand-ins for protected attributes`
      : leakageScore > 0.5
        ? 'Some features may be indirectly encoding demographic information'
        : 'No significant proxy features detected ✓';

  const plainMetricCards = [
    {
      icon: '⚖️',
      title: 'Approval Gap',
      body: approvalGapText,
      subtext: 'Legal minimum: 80% rule (EEOC)',
      status: disparateImpact < 0.8 ? 'red' : 'green',
    },
    {
      icon: '🎯',
      title: 'Error Rate Fairness',
      body: errorRateText,
      subtext: 'Threshold: < 5% difference',
      status: Math.abs(equalOpportunityDiff) > 0.05 ? 'red' : 'green',
    },
    {
      icon: '🔍',
      title: 'Hidden Bias Signals',
      body: hiddenBiasText,
      subtext:
        leakageScore > 0.5
          ? 'Proxy pattern detected in model inputs'
          : 'No meaningful proxy pattern detected',
      status: leakageScore > 0.75 ? 'red' : leakageScore > 0.5 ? 'amber' : 'green',
    },
  ] as const;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-12 h-12 border-2 border-brand-default border-t-transparent rounded-full animate-spin"></div>
        <div className="text-brand-default font-bold uppercase tracking-widest text-xs animate-pulse">Phase 1: Detect, Profile & Slicing</div>
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
                      "{auditResult.plain_english_summary}"
                    </p>
                    <button
                      onClick={() => navigate('/fix')}
                      className="inline-flex items-center rounded-lg bg-ink px-6 py-3 text-sm font-bold text-paper transition-colors duration-300 hover:bg-brand-default"
                    >
                      Fix This Now →
                    </button>
                  </div>
                  <div className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${heroTone.badge}`}>
                    Bias Score: {displayScore.toFixed(1)}
                  </div>
                </div>
              </motion.section>

              <motion.section variants={cardVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {plainMetricCards.map((card) => (
                  <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-start justify-between">
                      <span className="text-[28px] leading-none">{card.icon}</span>
                      <MetricStatusDot color={card.status} />
                    </div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{card.title}</p>
                    <p className="mb-6 text-[15px] font-medium leading-6 text-slate-900">{card.body}</p>
                    <p className="text-xs text-slate-400">{card.subtext}</p>
                  </article>
                ))}
              </motion.section>

              <motion.section
                variants={cardVariants}
                className="rounded-xl border-l-4 p-6 shadow-sm"
                style={{ backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6' }}
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-blue-700">Why is the model biased?</p>
                <p className="text-lg font-medium leading-8 text-slate-900">
                  The strongest driver of unfair denials is '{formatLabel(topShapFeature || 'key model features')}' - a feature that may indirectly encode demographic information.
                </p>
              </motion.section>

              <motion.section
                variants={cardVariants}
                className="rounded-xl border border-slate-200 border-l-[3px] bg-slate-50 p-6 shadow-sm"
                style={{ borderLeftColor: '#6366F1' }}
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-500">What this means legally</p>
                <p className="text-base leading-7 text-slate-700">{legalText}</p>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  Relevant regulations: EU AI Act Art. 10 · NYC Local Law 144
                </p>
              </motion.section>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="technical" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
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
                    <h4 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-ink-faint">Intersectional Slices</h4>
                    <div className="space-y-4">
                      {auditResult.intersectional_slices?.map((slice: any, index: number) => (
                        <div key={index} className="flex items-center justify-between border-b border-surface pb-3 last:border-0 last:pb-0">
                          <div className="mr-4 truncate text-[12px] font-semibold text-ink">{slice.group}</div>
                          <div className="text-xs font-bold text-danger-default">{(slice.fnr_gap * 100).toFixed(0)}% FNR</div>
                        </div>
                      ))}
                    </div>
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
                  <div className="rounded border border-surface bg-paper p-6">
                    <p className="text-sm leading-7 text-ink-muted">{legalText}</p>
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
