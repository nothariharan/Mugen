import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuditStore } from '../store/auditStore';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUploadId, setDomain, setUploadColumns, setLabelCol, setSensitiveCol } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [domain, setLocalDomain] = useState<'hiring' | 'finance' | 'healthcare'>('hiring');

  const onDrop = async (acceptedFiles: File[]) => {
    const csvFile = acceptedFiles.find(f => f.name.endsWith('.csv'));
    const pklFile = acceptedFiles.find(f => f.name.endsWith('.pkl'));

    if (csvFile && pklFile) {
      setLoading(true);
      try {
        const res = await apiClient.upload(csvFile, pklFile);
        setUploadId(res.upload_id);
        setDomain(domain);
        // Store the column list so /schema can populate its dropdowns
        setUploadColumns(res.columns ?? []);
        // Reset any previously chosen columns
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
      <div className="text-center mb-16 max-w-2xl animate-stagger-1">
        <h1 className="text-5xl md:text-6xl font-display font-extrabold text-ink mb-6 tracking-tight leading-[1.1]">
          The first explainable AI auditor for compliance.
        </h1>
        <p className="text-ink-muted text-lg tracking-wide max-w-xl mx-auto leading-relaxed font-medium">
          Detect, mitigate, and prove fairness internally before deployment. Upload your model and dataset to begin.
        </p>
      </div>

      <div className="w-full bg-paper border border-surface rounded-md p-10 animate-stagger-2">
        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <label className="block text-sm font-bold text-ink mb-3 uppercase tracking-wider">1. Select Domain</label>
            <p className="text-ink-faint text-sm mb-4 leading-relaxed">
              We apply strict legal thresholds depending on the domain context (e.g. EEOC for Hiring vs ECOA for Finance).
            </p>
            <div className="relative">
              <select
                className="w-full p-4 border border-surface rounded bg-surface hover:border-ink transition-colors outline-none cursor-pointer appearance-none font-medium text-ink"
                value={domain}
                onChange={(e) => setLocalDomain(e.target.value as any)}
              >
                <option value="hiring">Hiring / HR (EEOC Compliance)</option>
                <option value="finance">Finance / Credit (ECOA Compliance)</option>
                <option value="healthcare">Healthcare (ACA Compliance)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-ink-muted">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          <div>
             <label className="block text-sm font-bold text-ink mb-3 uppercase tracking-wider">2. Upload Assets</label>
             <p className="text-ink-faint text-sm mb-4 leading-relaxed">
              Provide your training dataset (.csv) and your trained scikit-learn pipeline (.pkl).
             </p>
             <div
               {...getRootProps()}
               className={`p-8 border-2 border-dashed rounded cursor-pointer transition-all flex flex-col items-center justify-center h-40
               ${isDragActive ? 'border-brand-default bg-brand-surface scale-[1.02]' : 'border-surface hover:border-brand-default hover:bg-surface'}`}
             >
                <input {...getInputProps()} />
                <p className="text-ink-muted text-sm text-center font-medium">
                  {isDragActive ? 'Drop files now...' : <>Drag & drop <b>.csv</b> and <b>.pkl</b> here.</>}
                </p>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-center mt-12 pt-10 border-t border-surface animate-stagger-3">
          <div className="text-ink-faint text-xs mb-5 uppercase tracking-[0.2em] font-bold">or skip to demo</div>
          <button
            onClick={() => {
              setUploadId('demo');
              setDomain(domain);
              setLabelCol('label');
              setSensitiveCol('gender');
              navigate('/audit');
            }}
            className="px-8 py-4 bg-ink text-paper font-bold rounded duration-300 hover:bg-brand-default transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            Load Example (German Credit Demo)
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="mt-8 flex flex-col items-center animate-stagger-4">
          <div className="w-8 h-8 border-2 border-brand-default border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-brand-default font-bold uppercase tracking-widest text-xs">Uploading and scanning...</div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
