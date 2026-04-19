import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import DriftReport from '../components/DriftReport';

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { auditId, fixId } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!auditId || !fixId) {
    navigate('/');
    return null;
  }

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await apiClient.getReport(auditId, fixId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mugen_compliance_report_${auditId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message || "Failed to generate report.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">Compliance Report</h2>
          <div className="flex items-center mt-2 space-x-3">
             <span className="text-slate-400 text-sm">Review data drift and generate legally mapped compliance documentation.</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Final Certification</h3>
          <p className="text-slate-500 max-w-2xl">
            Our AI judges (Gemini 1.5 Pro) will analyze your mitigation results against regulatory frameworks like the <b>EU AI Act</b> to produce a plain-English PDF report ready for your legal team.
          </p>
          {error && <div className="mt-4 text-red-500 text-sm font-semibold">{error}</div>}
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={loading}
          className="px-10 py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-xl active:scale-95 text-lg min-w-[280px] flex items-center justify-center disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-pulse">Consulting Gemini AI...</span>
          ) : (
            <span>Generate .PDF Report ↓</span>
          )}
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-slate-800">Production Data Drift</h3>
        <p className="text-slate-500 max-w-3xl">
          It's vital to monitor if real-world traffic diverges from your training data. Powered by Evidently AI.
        </p>
        <DriftReport auditId={auditId} />
      </div>
    </div>
  );
};

export default ReportPage;
