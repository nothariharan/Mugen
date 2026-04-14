const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const apiClient = {
  async upload(csvFile: File, pklFile: File) {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    formData.append('pkl_file', pklFile);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  async startAudit(uploadId: string, domain: string, runSecurityScan: boolean = false) {
    const response = await fetch(`${API_BASE_URL}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uploadId, domain, run_security_scan: runSecurityScan }),
    });
    return response.json();
  },

  async pollAudit(auditId: string) {
    const response = await fetch(`${API_BASE_URL}/audit/${auditId}`);
    return response.json();
  },

  async startFix(auditId: string, pathway: 'quick' | 'deep', fairnessMetric: string) {
    const response = await fetch(`${API_BASE_URL}/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId, pathway, fairness_metric: fairnessMetric }),
    });
    return response.json();
  },

  async getReport(auditId: string, fixId: string) {
    const response = await fetch(`${API_BASE_URL}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audit_id: auditId, fix_id: fixId }),
    });
    return response.blob();
  }
};
