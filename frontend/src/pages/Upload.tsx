import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, Package, ArrowRight,
  Loader2, ChevronDown, Zap, Shield, Scale,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';
import { useAuditStore } from '../store/auditStore';

const DOMAIN_OPTIONS = [
  { value: 'hiring',     label: 'Hiring / HR',      sub: 'EEOC Compliance', icon: Scale  },
  { value: 'finance',    label: 'Finance / Credit',  sub: 'ECOA Compliance', icon: Shield },
  { value: 'healthcare', label: 'Healthcare',        sub: 'ACA Compliance',  icon: Zap    },
] as const;

type Domain = 'hiring' | 'finance' | 'healthcare';

const item = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUploadId, setDomain, setUploadColumns, setLabelCol, setSensitiveCol } = useAuditStore();
  const [loading, setLoading]         = useState(false);
  const [domain, setLocalDomain]      = useState<Domain>('hiring');
  const [droppedFiles, setDroppedFiles] = useState<{ csv?: string; pkl?: string }>({});

  const onDrop = async (acceptedFiles: File[]) => {
    const csvFile = acceptedFiles.find(f => f.name.endsWith('.csv'));
    const pklFile = acceptedFiles.find(f => f.name.endsWith('.pkl'));
    setDroppedFiles({ csv: csvFile?.name, pkl: pklFile?.name });

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
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
    >
      {/* ── Section label ── */}
      <motion.p
        variants={item}
        className="text-[11px] font-bold tracking-[0.2em] uppercase text-slate-600 mb-6"
      >
        Begin your audit
      </motion.p>

      {/* ── Card ── */}
      <motion.div
        variants={item}
        className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-10"
        style={{ boxShadow: '0 1px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10">

          {/* ── Domain selector ── */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">
              1. Select Domain
            </label>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              Legal thresholds vary by domain — EEOC for Hiring, ECOA for Finance.
            </p>
            <div className="relative">
              <select
                className="w-full px-4 py-3.5 rounded-lg border border-white/[0.08] bg-white/[0.05] text-slate-200
                           text-sm font-medium appearance-none cursor-pointer
                           hover:border-white/20 focus:outline-none focus:border-white/30
                           transition-colors duration-200"
                style={{ colorScheme: 'dark' }}
                value={domain}
                onChange={e => setLocalDomain(e.target.value as Domain)}
                aria-label="Select domain"
              >
                {DOMAIN_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#111113]">
                    {opt.label} — {opt.sub}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            </div>
          </div>

          {/* ── File dropzone ── */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-widest">
              2. Upload Assets
            </label>
            <p className="text-slate-500 text-sm mb-4 leading-relaxed">
              Provide your training dataset (.csv) and trained scikit-learn pipeline (.pkl).
            </p>
            <div
              {...getRootProps()}
              className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-200
                          flex flex-col items-center justify-center min-h-[9rem] gap-3
                          ${isDragActive
                            ? 'border-emerald-500/60 bg-emerald-500/[0.06] scale-[1.01]'
                            : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]'
                          }`}
              role="button"
              tabIndex={0}
              aria-label="File upload dropzone"
            >
              <input {...getInputProps()} />
              <Upload className={`h-5 w-5 transition-colors ${isDragActive ? 'text-emerald-400' : 'text-slate-600'}`} />
              {isDragActive ? (
                <p className="text-emerald-400 text-sm font-semibold">Drop files now…</p>
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 text-sm font-medium">
                    Drag & drop <span className="font-bold text-slate-200">.csv</span> and{' '}
                    <span className="font-bold text-slate-200">.pkl</span> here
                  </p>
                  <p className="text-slate-600 text-xs mt-1">or click to browse</p>
                </div>
              )}

              {(droppedFiles.csv || droppedFiles.pkl) && !isDragActive && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {droppedFiles.csv && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <FileText className="h-3 w-3" />
                      {droppedFiles.csv}
                    </span>
                  )}
                  {droppedFiles.pkl && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <Package className="h-3 w-3" />
                      {droppedFiles.pkl}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Demo CTA ── */}
        <div className="flex flex-col items-center pt-8 border-t border-white/[0.06]">
          <p className="text-slate-600 text-[10px] mb-5 uppercase tracking-[0.2em] font-bold">
            or skip to demo
          </p>
          <button
            onClick={() => {
              setUploadId('demo');
              setDomain(domain);
              setLabelCol('label');
              setSensitiveCol('gender');
              navigate('/audit');
            }}
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg text-sm font-bold text-black bg-white
                       hover:bg-white/90 hover:scale-[1.02]
                       transition-all duration-200
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Zap className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12 shrink-0" />
            Load Example (German Credit Demo)
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
          </button>
        </div>
      </motion.div>

      {/* ── Loading spinner ── */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs">
            Uploading and scanning…
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default UploadPage;
