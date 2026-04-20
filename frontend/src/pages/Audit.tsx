import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuditStore } from '../store/auditStore';
import { apiClient } from '../api/client';
import BiasScoreGauge from '../components/BiasScoreGauge';
import AequitasGrid from '../components/AequitasGrid';
import ModelExplorer from '../components/ModelExplorer';
import ShapWaterfall from '../components/ShapWaterfall';

const AuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { uploadId, domain, setAuditId, auditResult, setAuditResult } = useAuditStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uploadId) {
      navigate('/');
      return;
    }

    const start = async () => {
      try {
        const { audit_id } = await apiClient.startAudit(uploadId, domain);
        setAuditId(audit_id);

        // Poll for results
        const poll = setInterval(async () => {
          const res = await apiClient.pollAudit(audit_id);
          if (res.status === 'done') {
            setAuditResult(res.result);
            setLoading(false);
            clearInterval(poll);
          } else if (res.status === 'error') {
            clearInterval(poll);
            setLoading(false);
            alert(`Audit Failed: ${res.message || "Unknown server error"}`);
            navigate('/');
          }
        }, 1500);
      } catch (err) {
        console.error(err);
      }
    };

    start();
  }, [uploadId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-slate-600 font-medium animate-pulse uppercase tracking-widest text-xs">Phase 1 Pipeline: Detect, Profile & Slicing...</div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">Audit Dashboard</h2>
          <div className="flex items-center mt-2 space-x-3">
             <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">{domain} domain</span>
             <span className="text-slate-300">|</span>
             <span className="text-slate-400 text-[10px] font-mono">ID: {uploadId}</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/fix')}
          className="px-10 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 text-lg"
        >
          Mitigate Bias →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
           <BiasScoreGauge score={auditResult.bias_score} />

           <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl shadow-sm relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full opacity-50 group-hover:scale-110 transition-transform"></div>
             <h3 className="font-bold text-amber-900 mb-3 flex items-center relative z-10">
               <span className="mr-2 text-xl">💡</span> Executive Finding
             </h3>
             <p className="text-amber-800 leading-relaxed italic text-lg relative z-10 font-medium">
               "{auditResult.plain_english_summary}"
             </p>
           </div>

           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Intersectional Slices</h4>
             <div className="space-y-4">
               {auditResult.intersectional_slices?.map((s: any, i: number) => (
                 <div key={i} className="flex justify-between items-center p-3 bg-red-50/50 rounded-lg border border-red-100">
                   <div className="text-[11px] font-bold text-slate-700 truncate mr-4">{s.group}</div>
                   <div className="text-red-600 font-black text-xs">{(s.fnr_gap * 100).toFixed(0)}% FNR</div>
                 </div>
               ))}
             </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
           <AequitasGrid metrics={auditResult.fairness_metrics} />

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ShapWaterfall data={auditResult.proxy_leakage?.top_proxy_features || {}} />
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Proxy Leakage Detection</h4>
                   <div className="text-3xl font-black text-slate-900 mb-2">{auditResult.proxy_leakage?.leakage_score}</div>
                   <p className="text-xs text-slate-500 leading-relaxed">
                     Score above <b>0.75</b> suggests features are strong proxies for protected attributes (leakage).
                   </p>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full mt-6 overflow-hidden">
                   <div
                    className={`h-full ${auditResult.proxy_leakage?.leakage_score > 0.7 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{width: `${auditResult.proxy_leakage?.leakage_score * 100}%`}}
                   ></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <ModelExplorer dataPoints={auditResult.model_explorer_points || []} />
    </div>
  );
};

export default AuditPage;
