import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft, ArrowRight, Tag, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuditStore } from '../store/auditStore';

function looksLikeLabel(col: string): boolean {
  const c = col.toLowerCase();
  return ['label', 'target', 'outcome', 'class', 'y', 'result', 'approved', 'default'].some(
    kw => c === kw || c.endsWith('_' + kw) || c.startsWith(kw + '_'),
  );
}
function looksLikeSensitive(col: string): boolean {
  const c = col.toLowerCase();
  return [
    'gender', 'sex', 'race', 'ethnicity', 'age', 'age_group', 'nationality',
    'religion', 'protected', 'disability', 'marital',
  ].some(kw => c.includes(kw));
}

const SchemaPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    uploadId, uploadColumns, domain,
    labelCol, sensitiveCol,
    setLabelCol, setSensitiveCol,
  } = useAuditStore();

  useEffect(() => {
    if (!uploadId || uploadId === 'demo') navigate('/');
  }, [uploadId, navigate]);

  const [initialised, setInitialised] = useState(false);
  useEffect(() => {
    if (initialised || uploadColumns.length === 0) return;
    setInitialised(true);
    if (!labelCol) {
      const guess = uploadColumns.find(looksLikeLabel) ?? uploadColumns[uploadColumns.length - 1];
      setLabelCol(guess);
    }
    if (!sensitiveCol) {
      const guess = uploadColumns.find(looksLikeSensitive) ?? '';
      if (guess) setSensitiveCol(guess);
    }
  }, [uploadColumns, labelCol, sensitiveCol, initialised, setLabelCol, setSensitiveCol]);

  const canProceed = labelCol && sensitiveCol && labelCol !== sensitiveCol;
  const hasConflict = labelCol && sensitiveCol && labelCol === sensitiveCol;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 animate-stagger-1">
        <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Step 2 of 2
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-ink mb-4 tracking-tight leading-[1.08]">
          Confirm your dataset schema
        </h1>
        <p className="text-ink-muted text-base leading-relaxed max-w-lg mx-auto">
          We detected <strong className="text-ink">{uploadColumns.length} columns</strong>. Tell us which column is the
          outcome you want to predict and which identifies the protected group.
        </p>
      </div>

      {/* Card */}
      <div className="w-full bg-paper border border-surface rounded-lg p-10 space-y-10 animate-stagger-2 shadow-sm">

        {/* Label column */}
        <div>
          <label
            htmlFor="label-col-select"
            className="flex items-center gap-2 text-xs font-bold text-ink mb-1 uppercase tracking-widest"
          >
            <Tag className="h-3.5 w-3.5 text-ink-muted" />
            Outcome / Label column
          </label>
          <p className="text-ink-muted text-sm mb-3 leading-relaxed">
            The column your model was trained to predict (e.g.{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">approved</code>,{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">label</code>,{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">default</code>).
          </p>
          <div className="relative">
            <select
              id="label-col-select"
              className="w-full p-4 border border-surface rounded-md bg-surface hover:border-ink-muted focus:outline-none focus:border-brand-default transition-colors cursor-pointer appearance-none font-medium text-ink text-sm"
              value={labelCol}
              onChange={e => setLabelCol(e.target.value)}
            >
              <option value="" disabled>Select a column…</option>
              {uploadColumns.map(col => (
                <option key={col} value={col}>
                  {col}{looksLikeLabel(col) ? ' ✦ suggested' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute inset-y-0 right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          </div>
        </div>

        {/* Sensitive attribute column */}
        <div>
          <label
            htmlFor="sensitive-col-select"
            className="flex items-center gap-2 text-xs font-bold text-ink mb-1 uppercase tracking-widest"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-ink-muted" />
            Protected attribute column
          </label>
          <p className="text-ink-muted text-sm mb-3 leading-relaxed">
            The demographic column the audit checks for bias (e.g.{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">gender</code>,{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">race</code>,{' '}
            <code className="bg-surface px-1.5 py-0.5 rounded text-xs font-mono">age_group</code>).
          </p>
          <div className="relative">
            <select
              id="sensitive-col-select"
              className="w-full p-4 border border-surface rounded-md bg-surface hover:border-ink-muted focus:outline-none focus:border-brand-default transition-colors cursor-pointer appearance-none font-medium text-ink text-sm"
              value={sensitiveCol}
              onChange={e => setSensitiveCol(e.target.value)}
            >
              <option value="" disabled>Select a column…</option>
              {uploadColumns
                .filter(col => col !== labelCol)
                .map(col => (
                  <option key={col} value={col}>
                    {col}{looksLikeSensitive(col) ? ' ✦ suggested' : ''}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute inset-y-0 right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          </div>
        </div>

        {/* Confirmation strip */}
        {canProceed && (
          <div className="flex items-start gap-3 rounded-md border border-surface bg-surface/50 px-5 py-4 text-sm text-ink-muted">
            <CheckCircle2 className="h-4 w-4 text-success-default shrink-0 mt-0.5" />
            <span>
              Auditing <strong className="text-ink">{domain}</strong> domain · predicting{' '}
              <code className="bg-paper border border-surface rounded px-1 font-mono text-xs">{labelCol}</code>{' '}
              · protected attribute{' '}
              <code className="bg-paper border border-surface rounded px-1 font-mono text-xs">{sensitiveCol}</code>
            </span>
          </div>
        )}

        {/* Validation error */}
        {hasConflict && (
          <div className="flex items-center gap-2 text-sm text-danger-default font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Label and protected attribute must be different columns.
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            id="schema-confirm-btn"
            disabled={!canProceed}
            onClick={() => navigate('/audit')}
            className={`inline-flex items-center gap-2 px-8 py-4 font-bold rounded-md transition-all duration-200 ${
              canProceed
                ? 'bg-ink text-paper hover:bg-brand-default shadow-sm hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-default'
                : 'bg-surface text-ink-faint cursor-not-allowed'
            }`}
          >
            Run Audit
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchemaPage;
