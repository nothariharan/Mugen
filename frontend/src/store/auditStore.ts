import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuditState {
  uploadId: string | null;
  auditId: string | null;
  fixId: string | null;
  domain: 'hiring' | 'finance' | 'healthcare';
  auditResult: any | null;
  fixResult: any | null;

  setUploadId: (id: string) => void;
  setAuditId: (id: string) => void;
  setFixId: (id: string) => void;
  setDomain: (domain: 'hiring' | 'finance' | 'healthcare') => void;
  setAuditResult: (result: any) => void;
  setFixResult: (result: any) => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
  uploadId: null,
  auditId: null,
  fixId: null,
  domain: 'hiring',
  auditResult: null,
  fixResult: null,

  setUploadId: (id) => set({ uploadId: id }),
  setAuditId: (id) => set({ auditId: id }),
  setFixId: (id) => set({ fixId: id }),
  setDomain: (domain) => set({ domain }),
  setAuditResult: (result) => set({ auditResult: result }),
  setFixResult: (result) => set({ fixResult: result }),
}), { name: 'mugen-audit-storage' })
);
