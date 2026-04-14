import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadPage from './pages/Upload';
import AuditPage from './pages/Audit';
import FixPage from './pages/Fix';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 antialiased">
        <header className="bg-white border-b border-slate-200 py-4 px-8 sticky top-0 z-50 backdrop-blur-md bg-white/80">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white group-hover:rotate-12 transition-transform shadow-lg shadow-blue-200">X</div>
              <span className="text-xl font-extrabold tracking-tight text-slate-800">Explainable AI <span className="text-blue-600">Auditor</span></span>
            </Link>
            <nav className="flex items-center space-x-8 text-sm font-semibold text-slate-500">
              <Link to="/" className="hover:text-blue-600 transition-colors">How it works</Link>
              <Link to="/" className="hover:text-blue-600 transition-colors">Documentation</Link>
              <Link to="/" className="px-5 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-black transition-all shadow-md active:scale-95">Support</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-8">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/fix" element={<FixPage />} />
          </Routes>
        </main>

        <footer className="mt-20 border-t border-slate-200 py-10 px-8 text-center bg-white">
           <p className="text-slate-400 text-sm">© 2026 XAI Auditor — Built for Hackathon Demo. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
