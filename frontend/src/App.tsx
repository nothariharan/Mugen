import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, HelpCircle, LifeBuoy } from 'lucide-react';
import UploadPage from './pages/Upload';
import SchemaPage from './pages/Schema';
import AuditPage from './pages/Audit';
import FixPage from './pages/Fix';
import ReportPage from './pages/Report';

const NAV_LINKS = [
  { to: '/', label: 'How it works', icon: BookOpen },
  { to: '/', label: 'Documentation', icon: HelpCircle },
] as const;

const AppShell: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen font-sans selection:bg-brand-surface selection:text-brand-default antialiased">
      {/* Header */}
      <header className="bg-paper/90 border-b border-surface py-4 px-8 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group" aria-label="Mugen home">
            <img
              src="/logo.png"
              alt="Mugen"
              className="h-16 w-auto transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
            />
          </Link>

          <nav className="flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors duration-200"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-ink text-paper rounded-md text-sm font-semibold hover:bg-brand-default transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-default"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Support
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto py-12 px-6">
        <Routes>
          <Route path="/"        element={<UploadPage />} />
          <Route path="/schema"  element={<SchemaPage />} />
          <Route path="/audit"   element={<AuditPage />} />
          <Route path="/fix"     element={<FixPage />} />
          <Route path="/report"  element={<ReportPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="mt-24 border-t border-surface py-10 px-8 bg-paper">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-faint">
          <p>© 2026 Mugen — Built for Hackathon Demo.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-ink-muted transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-ink-muted transition-colors">Terms</Link>
            <Link to="/" className="hover:text-ink-muted transition-colors">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App: React.FC = () => (
  <Router>
    <AppShell />
  </Router>
);

export default App;
