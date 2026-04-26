import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Package, ArrowRight, Loader2, ChevronDown, Zap, Shield, Scale } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuditStore } from '../store/auditStore';

const DOMAIN_OPTIONS = [
  { value: 'hiring',     label: 'Hiring / HR',    sub: 'EEOC Compliance',  icon: Scale },
  { value: 'finance',    label: 'Finance / Credit', sub: 'ECOA Compliance', icon: Shield },
  { value: 'healthcare', label: 'Healthcare',      sub: 'ACA Compliance',   icon: Zap },
] as const;

type Domain = 'hiring' | 'finance' | 'healthcare';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUploadId, setDomain, setUploadColumns, setLabelCol, setSensitiveCol } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [domain, setLocalDomain] = useState<Domain>('hiring');
  const [droppedFiles, setDroppedFiles] = useState<{ csv?: string; pkl?: string }>({});

  const onDrop = async (acceptedFiles: File[]) => {
    const csvFile = acceptedFiles.find(f => f.name.endsWith('.csv'));
    const pklFile = acceptedFiles.find(f => f.name.endsWith('.pkl'));

    setDroppedFiles({
      csv: csvFile?.name,
      pkl: pklFile?.name,
    });

    if (csvFile && pklFile) {
      setLoading(true);
      try {
        const res = await apiClient.upload(csvFile, pklFile);
        setUploadId(res.upload_id);
        setDomain(domain);
        setUploadColumns(res.columns ?? []);
        setLabelCol('');
        setSensitiveCol('');
        navigate('/schema');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] p-4 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-16 max-w-2xl animate-stagger-1">
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-ink mb-6 tracking-tight leading-[1.08]">
          The first explainable AI auditor for compliance.
        </h1>
        <p className="text-ink-muted text-lg max-w-xl mx-auto leading-relaxed">
          Detect, mitigate, and prove fairness before deployment. Upload your model and dataset to begin.
        </p>
      </div>

      <div className="w-full bg-paper border border-surface rounded-lg p-10 animate-stagger-2 shadow-sm">
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Domain */}
          <div>
            <label className="block text-xs font-bold text-ink mb-3 uppercase tracking-widest">
              1. Select Domain
            </label>
            <p className="text-ink-muted text-sm mb-4 leading-relaxed">
              Legal thresholds vary by domain — EEOC for Hiring, ECOA for Finance.
            </p>
            <div className="relative">
              <select
                className="w-full p-4 border border-surface rounded-md bg-surface hover:border-ink-muted focus:outline-none focus:border-brand-default transition-colors cursor-pointer appearance-none font-medium text-ink text-sm"
                value={domain}
                onChange={(e) => setLocalDomain(e.target.value as Domain)}
                aria-label="Select domain"
              >
                {DOMAIN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.sub}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute inset-y-0 right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            </div>
          </div>

          {/* Upload */}
          <div>
            <label className="block text-xs font-bold text-ink mb-3 uppercase tracking-widest">
              2. Upload Assets
            </label>
            <p className="text-ink-muted text-sm mb-4 leading-relaxed">
              Provide your training dataset (.csv) and trained scikit-learn pipeline (.pkl).
            </p>
            <div
              {...getRootProps()}
              className={`p-6 border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[9rem] gap-3
                ${isDragActive
                  ? 'border-brand-default bg-brand-surface scale-[1.01]'
                  : 'border-surface hover:border-brand-default hover:bg-surface'
                }`}
              role="button"
              tabIndex={0}
              aria-label="File upload dropzone"
            >
              <input {...getInputProps()} />
              <Upload className={`h-6 w-6 transition-colors ${isDragActive ? 'text-brand-default' : 'text-ink-faint'}`} />
              {isDragActive ? (
                <p className="text-brand-default text-sm font-semibold">Drop files now…</p>
              ) : (
                <div className="text-center">
                  <p className="text-ink-muted text-sm font-medium">
                    Drag &amp; drop <span className="font-bold text-ink">.csv</span> and <span className="font-bold text-ink">.pkl</span> here
                  </p>
                  <p className="text-ink-faint text-xs mt-1">or click to browse</p>
                </div>
              )}

              {/* Dropped file indicators */}
              {(droppedFiles.csv || droppedFiles.pkl) && !isDragActive && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {droppedFiles.csv && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-surface px-3 py-1 text-xs font-semibold text-success-default">
                      <FileText className="h-3 w-3" />
                      {droppedFiles.csv}
                    </span>
                  )}
                  {droppedFiles.pkl && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-surface px-3 py-1 text-xs font-semibold text-success-default">
                      <Package className="h-3 w-3" />
                      {droppedFiles.pkl}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Demo CTA */}
        <div className="flex flex-col items-center mt-12 pt-10 border-t border-surface animate-stagger-3">
          <p className="text-ink-faint text-xs mb-5 uppercase tracking-[0.2em] font-bold">or skip to demo</p>
          <button
            onClick={() => {
              setUploadId('demo');
              setDomain(domain);
              setLabelCol('label');
              setSensitiveCol('gender');
              navigate('/audit');
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-ink text-paper font-bold rounded-md transition-all duration-200 shadow-sm hover:bg-brand-default hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-default"
          >
            <Zap className="h-4 w-4" />
            Load Example (German Credit Demo)
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3 animate-stagger-4">
          <Loader2 className="h-6 w-6 text-brand-default animate-spin" />
          <p className="text-brand-default font-bold uppercase tracking-widest text-xs">
            Uploading and scanning…
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
