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
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-12 h-12 border-2 border-brand-default border-t-transparent rounded-full animate-spin"></div>
      <div className="text-brand-default font-bold uppercase tracking-widest text-xs animate-pulse">Phase 1: Detect, Profile & Slicing</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-surface pb-6 animate-stagger-1">
        <div>
          <div className="flex items-center space-x-3 mb-4">
             <span className="px-3 py-1 bg-surface text-ink-muted rounded-sm text-[10px] font-bold uppercase tracking-widest">{domain} domain</span>
             <span className="text-surface">|</span>
             <span className="text-ink-faint text-[10px] font-mono">ID: {uploadId}</span>
          </div>
          <h2 className="text-5xl font-display font-extrabold text-ink leading-none tracking-tight">Audit Results</h2>
        </div>
        <button
          onClick={() => navigate('/fix')}
          className="px-10 py-4 bg-brand-default text-paper font-bold rounded hover:bg-ink transition-colors duration-300 shadow-sm hover:shadow active:translate-y-px"
        >
          Mitigate Bias →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-10 animate-stagger-2">
           <BiasScoreGauge score={auditResult.bias_score} />

           <div className="border-l-4 border-brand-default pl-6 py-2">
             <h3 className="font-bold text-ink mb-3 text-sm uppercase tracking-widest">Executive Finding</h3>
             <p className="text-ink-muted leading-relaxed font-medium text-lg">
               "{auditResult.plain_english_summary}"
             </p>
           </div>

           <div className="bg-paper p-6 rounded border border-surface">
             <h4 className="text-[10px] font-bold uppercase text-ink-faint tracking-widest mb-6">Intersectional Slices</h4>
             <div className="space-y-4">
               {auditResult.intersectional_slices?.map((s: any, i: number) => (
                 <div key={i} className="flex justify-between items-center pb-3 border-b border-surface last:border-0 last:pb-0">
                   <div className="text-[12px] font-semibold text-ink truncate mr-4">{s.group}</div>
                   <div className="text-danger-default font-bold text-xs">{(s.fnr_gap * 100).toFixed(0)}% FNR</div>
                 </div>
               ))}
             </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-12">
           <div className="animate-stagger-3">
             <AequitasGrid metrics={auditResult.fairness_metrics} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-stagger-4">
              <ShapWaterfall data={auditResult.proxy_leakage?.top_proxy_features || {}} />
              <div className="bg-paper p-8 rounded border border-surface flex flex-col justify-between">
                <div>
                   <h4 className="text-[10px] font-bold uppercase text-ink-faint tracking-widest mb-6">Proxy Leakage</h4>
                   <div className="text-4xl font-display font-extrabold text-ink mb-3">{auditResult.proxy_leakage?.leakage_score}</div>
                   <p className="text-sm text-ink-muted leading-relaxed">
                     Score above <b>0.75</b> suggests features are acting as strong proxies for protected attributes (leakage occurs).
                   </p>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full mt-8 overflow-hidden">
                   <div
                    className={`h-full ${auditResult.proxy_leakage?.leakage_score > 0.7 ? 'bg-danger-default' : 'bg-success-default'}`}
                    style={{width: `${auditResult.proxy_leakage?.leakage_score * 100}%`}}
                   ></div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="animate-stagger-5">
        <ModelExplorer dataPoints={auditResult.model_explorer_points || []} />
      </div>
    </div>
  );
};

export default AuditPage;
