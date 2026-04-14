import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuditStore } from '../store/auditStore';

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const setUploadId = useAuditStore(s => s.setUploadId);
  const setDomain = useAuditStore(s => s.setDomain);
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
        navigate('/audit');
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Detect & Fix AI Bias</h1>
        <p className="text-slate-600">The world's first explainable AI auditor for compliance teams.</p>
      </div>

      <div className="w-full bg-white shadow-xl rounded-2xl p-8 border border-slate-100">
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">1. Select Industry Domain</label>
            <select
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              value={domain}
              onChange={(e) => setLocalDomain(e.target.value as any)}
            >
              <option value="hiring">Hiring / HR (EEOC Compliance)</option>
              <option value="finance">Finance / Credit (ECOA Compliance)</option>
              <option value="healthcare">Healthcare (ACA Compliance)</option>
            </select>
          </div>
          <div>
             <label className="block text-sm font-semibold text-slate-700 mb-2">2. Upload Dataset & Model</label>
             <div
               {...getRootProps()}
               className={`p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center h-full
               ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
             >
                <input {...getInputProps()} />
                <p className="text-slate-500 text-sm text-center">
                  Drag & drop <b>.csv</b> and <b>.pkl</b> files here, or click to select.
                </p>
             </div>
          </div>
        </div>

        <div className="flex flex-col items-center mt-8">
          <div className="text-slate-400 text-xs mb-4 uppercase font-bold tracking-widest">or skip to demo</div>
          <button
            onClick={() => { setUploadId('demo'); setDomain(domain); navigate('/audit'); }}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition-all shadow-md active:scale-95"
          >
            Load German Credit Demo Dataset
          </button>
        </div>
      </div>
      {loading && <div className="mt-4 animate-pulse text-blue-600 font-medium">Uploading and scanning...</div>}
    </div>
  );
};

export default UploadPage;
