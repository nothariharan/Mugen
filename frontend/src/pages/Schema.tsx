import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';

// Heuristic: score a column name to suggest it as label or sensitive attribute
function looksLikeLabel(col: string): boolean {
  const c = col.toLowerCase();
  return ['label', 'target', 'outcome', 'class', 'y', 'result', 'approved', 'default'].some(
    (kw) => c === kw || c.endsWith('_' + kw) || c.startsWith(kw + '_'),
  );
}
function looksLikeSensitive(col: string): boolean {
  const c = col.toLowerCase();
  return [
    'gender', 'sex', 'race', 'ethnicity', 'age', 'age_group', 'nationality',
    'religion', 'protected', 'disability', 'marital',
  ].some((kw) => c.includes(kw));
}

const SchemaPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    uploadId,
    uploadColumns,
    domain,
    labelCol,
    sensitiveCol,
    setLabelCol,
    setSensitiveCol,
  } = useAuditStore();

  // Guard: if no upload in progress, go home
  useEffect(() => {
    if (!uploadId || uploadId === 'demo') {
      navigate('/');
    }
  }, [uploadId, navigate]);

  // Auto-select sensible defaults from the column list on first render
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 animate-stagger-1">
        <div className="inline-flex items-center gap-2 mb-4 rounded-full bg-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Step 2 of 2
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-ink mb-4 tracking-tight leading-[1.1]">
          Confirm your dataset schema
        </h1>
        <p className="text-ink-muted text-base leading-relaxed max-w-lg mx-auto">
          We detected <strong>{uploadColumns.length} columns</strong>. Tell us which column is the
          outcome you want to predict and which identifies the protected group.
        </p>
      </div>

      {/* Mapping card */}
      <div className="w-full bg-paper border border-surface rounded-md p-10 space-y-10 animate-stagger-2">
        {/* Label column */}
        <div>
          <label
            htmlFor="label-col-select"
            className="block text-sm font-bold text-ink mb-1 uppercase tracking-wider"
          >
            Outcome / Label column
          </label>
          <p className="text-ink-faint text-sm mb-3 leading-relaxed">
            The column your model was trained to predict (e.g.{' '}
            <code className="bg-surface px-1 rounded text-xs">approved</code>,{' '}
            <code className="bg-surface px-1 rounded text-xs">label</code>,{' '}
            <code className="bg-surface px-1 rounded text-xs">default</code>).
          </p>
          <div className="relative">
            <select
              id="label-col-select"
              className="w-full p-4 border border-surface rounded bg-surface hover:border-ink transition-colors outline-none cursor-pointer appearance-none font-medium text-ink"
              value={labelCol}
              onChange={(e) => setLabelCol(e.target.value)}
            >
              <option value="" disabled>Select a column…</option>
              {uploadColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                  {looksLikeLabel(col) ? ' ✦ suggested' : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sensitive attribute column */}
        <div>
          <label
            htmlFor="sensitive-col-select"
            className="block text-sm font-bold text-ink mb-1 uppercase tracking-wider"
          >
            Protected attribute column
          </label>
          <p className="text-ink-faint text-sm mb-3 leading-relaxed">
            The demographic column the audit checks for bias (e.g.{' '}
            <code className="bg-surface px-1 rounded text-xs">gender</code>,{' '}
            <code className="bg-surface px-1 rounded text-xs">race</code>,{' '}
            <code className="bg-surface px-1 rounded text-xs">age_group</code>).
          </p>
          <div className="relative">
            <select
              id="sensitive-col-select"
              className="w-full p-4 border border-surface rounded bg-surface hover:border-ink transition-colors outline-none cursor-pointer appearance-none font-medium text-ink"
              value={sensitiveCol}
              onChange={(e) => setSensitiveCol(e.target.value)}
            >
              <option value="" disabled>Select a column…</option>
              {uploadColumns
                .filter((col) => col !== labelCol)
                .map((col) => (
                  <option key={col} value={col}>
                    {col}
                    {looksLikeSensitive(col) ? ' ✦ suggested' : ''}
                  </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted">
              <svg className="fill-current h-4 w-4" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Confirmation strip */}
        {canProceed && (
          <div className="rounded-lg border border-surface bg-surface/50 px-5 py-3 text-sm text-ink-muted animate-in fade-in duration-300">
            Auditing <strong className="text-ink">{domain}</strong> domain · predicting{' '}
            <code className="bg-paper border border-surface rounded px-1">{labelCol}</code> · protected
            attribute{' '}
            <code className="bg-paper border border-surface rounded px-1">{sensitiveCol}</code>
          </div>
        )}

        {/* Validation error */}
        {labelCol && sensitiveCol && labelCol === sensitiveCol && (
          <p className="text-sm text-danger-default font-medium">
            Label and protected attribute must be different columns.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
          >
            ← Back
          </button>
          <button
            id="schema-confirm-btn"
            disabled={!canProceed}
            onClick={() => navigate('/audit')}
            className={`px-8 py-4 font-bold rounded transition-all duration-300 ${
              canProceed
                ? 'bg-ink text-paper hover:bg-brand-default shadow-sm hover:shadow-md hover:-translate-y-0.5'
                : 'bg-surface text-ink-faint cursor-not-allowed'
            }`}
          >
            Run Audit →
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchemaPage;
