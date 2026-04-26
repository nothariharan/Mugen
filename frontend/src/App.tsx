import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadPage from './pages/Upload';
import SchemaPage from './pages/Schema';
import AuditPage from './pages/Audit';
import FixPage from './pages/Fix';
import ReportPage from './pages/Report';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen font-sans selection:bg-brand-surface selection:text-brand-default antialiased">
        <header className="bg-paper/90 border-b border-surface py-5 px-8 sticky top-0 z-50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <img src="/logo.png" alt="Mugen Logo" className="h-18 w-auto transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5" />
            </Link>
            <nav className="flex items-center space-x-10 text-sm font-medium text-ink-muted">
              <Link to="/" className="hover:text-ink transition-colors duration-200">How it works</Link>
              <Link to="/" className="hover:text-ink transition-colors duration-200">Documentation</Link>
              <Link to="/" className="px-5 py-2.5 bg-ink text-paper rounded hover:bg-brand-default transition-colors duration-200 font-medium">Support</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-12 px-6 animate-in fade-in duration-500">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/schema" element={<SchemaPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/fix" element={<FixPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </main>

        <footer className="mt-24 border-t border-surface py-12 px-8 text-center bg-paper">
           <p className="text-ink-faint text-sm">© 2026 Mugen — Built for Hackathon Demo. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
};

export default App;
