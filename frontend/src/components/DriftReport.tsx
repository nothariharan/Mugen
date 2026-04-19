import React from 'react';

interface Props {
  auditId: string;
}

const DriftReport: React.FC<Props> = ({ auditId }) => {
  return (
    <div className="w-full h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <iframe 
        src={`/api/drift/${auditId}`} 
        className="w-full h-full border-none"
        title="Data Drift Report"
      />
    </div>
  );
};

export default DriftReport;
