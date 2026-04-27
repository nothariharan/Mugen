import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookOpen, HelpCircle, LifeBuoy } from 'lucide-react';
import UploadPage from './pages/Upload';
import SchemaPage from './pages/Schema';
import AuditPage from './pages/Audit';
import FixPage from './pages/Fix';
import ReportPage from './pages/Report';
import HowItWorksPage from './pages/HowItWorks';
import Hero from './components/Hero';

const NAV_LINKS = [
  { to: '/how-it-works', label: 'How it works', icon: BookOpen },
  { to: '/', label: 'Documentation', icon: HelpCircle },
] as const;

const DARK_ROUTES = ['/', '/how-it-works'];

const AppShell: React.FC = () => {
  const location = useLocation();
  const isDark  = DARK_ROUTES.includes(location.pathname);
  const isHome  = location.pathname === '/';

  return (
    <div className={`min-h-screen font-sans selection:bg-brand-surface selection:text-brand-default antialiased ${isDark ? 'bg-[#050507]' : 'bg-paper'}`}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className={`py-3 px-8 sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${
          isDark
            ? 'bg-black/50 border-b border-white/[0.07]'
            : 'bg-paper/90 border-b border-surface'
        }`}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center">

          {/* Logo — pill container on dark routes */}
          <Link to="/" className="group flex items-center" aria-label="Mugen home">
            {isDark ? (
              <span className="flex items-center rounded-xl border border-white/[0.10] bg-white/[0.05] px-3 py-1.5 transition-all duration-200 group-hover:bg-white/[0.09] group-hover:border-white/[0.18]">
                <img
                  src="/logo.png"
                  alt="Mugen"
                  className="h-10 w-auto"
                />
              </span>
            ) : (
              <img
                src="/logo.png"
                alt="Mugen"
                className="h-14 w-auto transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
              />
            )}
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 ${
                  isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <Link
              to="/"
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                isDark
                  ? 'bg-white/[0.06] text-white border border-white/[0.10] hover:bg-white/[0.12] hover:border-white/20 focus-visible:outline-white/40'
                  : 'bg-ink text-paper hover:bg-brand-default focus-visible:outline-brand-default'
              }`}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              Support
            </Link>
          </nav>
        </div>
      </header>

      {/* Full-bleed Hero — home only */}
      {isHome && <Hero />}

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className={isDark ? '' : 'max-w-7xl mx-auto py-12 px-6'}>
        <Routes>
          <Route path="/"              element={<UploadPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/schema"        element={<SchemaPage />} />
          <Route path="/audit"         element={<AuditPage />} />
          <Route path="/fix"           element={<FixPage />} />
          <Route path="/report"        element={<ReportPage />} />
        </Routes>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className={`mt-24 border-t py-10 px-8 ${isDark ? 'border-white/[0.07] bg-[#050507]' : 'border-surface bg-paper'}`}>
        <div className={`max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm ${isDark ? 'text-slate-700' : 'text-ink-faint'}`}>
          <p>© 2026 Mugen — Built for Hackathon Demo.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-slate-400' : 'hover:text-ink-muted'}`}>Privacy</Link>
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-slate-400' : 'hover:text-ink-muted'}`}>Terms</Link>
            <Link to="/" className={`transition-colors ${isDark ? 'hover:text-slate-400' : 'hover:text-ink-muted'}`}>Docs</Link>
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
