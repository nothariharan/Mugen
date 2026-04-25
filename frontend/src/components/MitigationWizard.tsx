import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useAuditStore } from '../store/auditStore';

export type FairnessMetric = 'demographic_parity' | 'equal_opportunity' | 'equalized_odds';

interface MetricOption {
  id: FairnessMetric;
  label: string;
  tagline: string;
  technical: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  {
    id: 'demographic_parity',
    label: 'Demographic Parity',
    tagline: 'Equalize approval rates across groups',
    technical: 'demographic_parity_difference',
  },
  {
    id: 'equal_opportunity',
    label: 'Equal Opportunity',
    tagline: 'Equalize true positive rates across groups',
    technical: 'equal_opportunity_difference',
  },
  {
    id: 'equalized_odds',
    label: 'Equalized Odds',
    tagline: 'Equalize both TPR and FPR across groups',
    technical: 'equalized_odds_difference',
  },
];

const METRIC_EDUCATION: Record<FairnessMetric, { title: string; body: string; color: 'blue' | 'amber' }> = {
  demographic_parity: {
    title: 'Goal: Equalize Approval Rates',
    body: 'This forces the model to approve Female and Male applicants at the exact same rate. Legal minimum: 80% rule (EEOC / EU AI Act Article 10).',
    color: 'blue',
  },
  equal_opportunity: {
    title: 'Goal: Equalize True Positive Rates',
    body: 'This ensures qualified applicants from all groups have the same chance of being correctly approved — the model is penalized only when it wrongly denies a deserving candidate.',
    color: 'blue',
  },
  equalized_odds: {
    title: 'Goal: Equalize Both Error Types',
    body: 'The strictest constraint: both false positives and false negatives must be equalized across groups. Recommended when model errors carry asymmetric real-world costs.',
    color: 'amber',
  },
};

function getDefaultMetric(domain: string): FairnessMetric {
  if (domain === 'hiring') return 'demographic_parity';
  if (domain === 'healthcare' || domain === 'finance') return 'equal_opportunity';
  return 'demographic_parity';
}

interface MitigationWizardProps {
  onExecute: (metric: FairnessMetric, pathway: 'quick' | 'deep') => void;
  onCancel: () => void;
}

const MitigationWizard: React.FC<MitigationWizardProps> = ({ onExecute, onCancel }) => {
  const { domain, auditResult } = useAuditStore();
  const [selectedMetric, setSelectedMetric] = useState<FairnessMetric>(getDefaultMetric(domain));
  const [pathway, setPathway] = useState<'quick' | 'deep'>('quick');

  // Auto-select based on domain whenever it changes
  useEffect(() => {
    setSelectedMetric(getDefaultMetric(domain));
  }, [domain]);

  const education = METRIC_EDUCATION[selectedMetric];

  return (
    <div className="animate-stagger-1 max-w-3xl mx-auto space-y-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          Mitigation Studio · Step 1 of 2
        </p>
        <h2 className="text-4xl font-display font-extrabold tracking-tight text-ink leading-none">
          Configure Mitigation Strategy
        </h2>
        <p className="text-base text-ink-muted leading-relaxed mt-3">
          Based on your audit, we recommend optimizing for{' '}
          <span className="font-semibold text-ink">Demographic Parity</span>. You may adjust the
          fairness goal below.
        </p>
      </div>

      {/* ── Fairness Goal Selector ─────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          Fairness Goal
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {METRIC_OPTIONS.map((opt) => {
            const isSelected = selectedMetric === opt.id;
            return (
              <button
                key={opt.id}
                id={`metric-${opt.id}`}
                onClick={() => setSelectedMetric(opt.id)}
                className={`
                  relative flex flex-col items-start rounded-xl border-2 p-5 text-left
                  transition-all duration-200 focus:outline-none focus-visible:ring-2
                  focus-visible:ring-brand-default focus-visible:ring-offset-2
                  ${isSelected
                    ? 'border-brand-default bg-brand-surface shadow-sm'
                    : 'border-surface bg-paper hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-default" />
                  </span>
                )}

                {/* Auto-recommended badge */}
                {opt.id === getDefaultMetric(domain) && (
                  <span className="mb-3 inline-block rounded-full bg-brand-default/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand-default">
                    Recommended
                  </span>
                )}

                <p className={`text-sm font-bold leading-snug ${isSelected ? 'text-brand-default' : 'text-ink'}`}>
                  {opt.label}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                  {opt.tagline}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Dynamic Educational Panel ──────────────────────────────────── */}
      <section
        key={selectedMetric}
        className={`
          flex items-start gap-4 rounded-xl p-5 border animate-in fade-in duration-300
          ${education.color === 'blue'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
          }
        `}
      >
        <Info className={`mt-0.5 h-5 w-5 flex-shrink-0 ${education.color === 'blue' ? 'text-blue-500' : 'text-amber-500'}`} />
        <div>
          <p className={`text-sm font-bold mb-1 ${education.color === 'blue' ? 'text-blue-900' : 'text-amber-900'}`}>
            {education.title}
          </p>
          <p className="text-sm leading-relaxed">{education.body}</p>
        </div>
      </section>

      {/* ── Pathway Selector ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          Mitigation Engine
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              id: 'quick' as const,
              label: 'Quick Fix',
              sublabel: 'Fairlearn · ThresholdOptimizer',
              desc: 'Post-processing — adjusts decision boundaries. Fast and non-invasive.',
              badge: 'Recommended',
              badgeColor: 'text-brand-default bg-brand-surface border-brand-default/20',
            },
            {
              id: 'deep' as const,
              label: 'Deep Fix',
              sublabel: 'AIF360 · Reweighing + RandomForest',
              desc: 'Pre-processing — fixes the underlying data distribution and retrains.',
              badge: 'More Thorough',
              badgeColor: 'text-success-default bg-success-surface border-success-default/20',
            },
          ].map((p) => {
            const isSelected = pathway === p.id;
            return (
              <button
                key={p.id}
                id={`pathway-${p.id}`}
                onClick={() => setPathway(p.id)}
                className={`
                  relative flex flex-col items-start rounded-xl border-2 p-4 text-left
                  transition-all duration-200
                  ${isSelected
                    ? 'border-slate-700 bg-slate-50 shadow-sm'
                    : 'border-surface bg-paper hover:border-slate-300'
                  }
                `}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3">
                    <CheckCircle2 className="w-4 h-4 text-slate-700" />
                  </span>
                )}
                <span className={`mb-2 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${p.badgeColor}`}>
                  {p.badge}
                </span>
                <p className="text-sm font-bold text-ink">{p.label}</p>
                <p className="text-[10px] font-mono text-ink-muted mt-0.5">{p.sublabel}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Tradeoff Warning ───────────────────────────────────────────── */}
      <section className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-bold text-amber-900 mb-1">Tradeoff Warning</p>
          <p className="text-sm leading-relaxed">
            Enforcing this fairness metric may shift the model's decision boundaries, potentially
            increasing the overall{' '}
            <span className="font-semibold">False Positive rate</span>. Review post-fix metrics
            carefully before deployment.
          </p>
        </div>
      </section>

      {/* ── Audit Context Strip ────────────────────────────────────────── */}
      {auditResult && (
        <div className="flex items-center gap-6 rounded-lg border border-surface bg-surface/50 px-5 py-3 text-xs text-ink-muted">
          <span>
            Domain:{' '}
            <span className="font-semibold uppercase text-ink">{domain}</span>
          </span>
          <span>
            Bias Score:{' '}
            <span className="font-semibold text-danger-default">
              {auditResult.bias_score?.toFixed(1)}
            </span>
          </span>
          <span>
            Recommended:{' '}
            <span className="font-semibold text-ink">
              {auditResult.recommended_metric || 'demographic_parity'}
            </span>
          </span>
        </div>
      )}

      {/* ── Action Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 border-t border-surface pt-6">
        <button
          id="wizard-cancel"
          onClick={onCancel}
          className="rounded-md px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          Cancel
        </button>
        <button
          id="wizard-execute"
          onClick={() => onExecute(selectedMetric, pathway)}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800 active:scale-[0.98]"
        >
          Execute Mitigation
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

export default MitigationWizard;
